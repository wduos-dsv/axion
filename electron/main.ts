import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as net from "node:net";
import fs from "fs";
import ExcelJS from "exceljs";

const require = createRequire(import.meta.url);
// bwip-js doesn't have a native ESM default export in some setups, use require
const bwipjs = require("bwip-js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    frame: false,
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    height: 500,
    minHeight: 500,
    width: 700,
    minWidth: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  /* Use contextBridge
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  }); */

  win.removeMenu();

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// helpers
function sendZplOverTcp(
  ip: string,
  port: number,
  zplData: string,
  timeoutMs: number = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    if (timeoutMs > 0) {
      client.setTimeout(timeoutMs);
    }

    client.connect(port, ip, () => {
      client.write(zplData, "utf-8", () => {
        setTimeout(() => {
          client.end();
        }, 500);
      });
    });

    client.on("error", (err) => {
      client.destroy();
      reject(err);
    });

    if (timeoutMs > 0) {
      client.on("timeout", () => {
        client.destroy();
        reject(
          new Error(
            "Tempo de conexão esgotado. Verifique a rede ou configurações da impressora.",
          ),
        );
      });
    }

    client.on("close", () => {
      resolve();
    });
  });
}

function getBoxTypesDatabasePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "box-types.json");
  } else {
    return path.join(__dirname, "../resources/box-types.json");
  }
}

ipcMain.handle("get-printers", async () => {
  if (!win) return [];
  return await win.webContents.getPrintersAsync();
});

ipcMain.handle(
  "generate-case-id",
  async (_, orderNumber, priority, municipality, orderData, printerName) => {
    const dbPath = getBoxTypesDatabasePath();
    let db: Array<{ SKU: string; Type: string }> = [];

    const getBoxTypeFromDb = (sku: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const foundBox: any = db.find((box: any) => box.SKU === sku);
      return foundBox ? foundBox.Type : "";
    };

    try {
      const fileData = fs.readFileSync(dbPath, "utf-8");
      db = JSON.parse(fileData);
    } catch (error: unknown) {
      console.log("Failed to load box-types.json database:", error);
      return { success: false, error: (error as Error).message };
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet();
    const thinBorder = {
      top: { style: "thin", color: { argb: "000000" } },
      left: { style: "thin", color: { argb: "000000" } },
      bottom: { style: "thin", color: { argb: "000000" } },
      right: { style: "thin", color: { argb: "000000" } },
    } as const;

    worksheet.columns = [
      { key: "bType", width: 7 },
      { key: "sku", width: 12 },
      { key: "pos", width: 12 },
      { key: "qty", width: 10 },
      { key: "caseId", width: 15 },
      { key: "barcode", width: 26 },
    ];

    worksheet.columns.forEach((column) => {
      column.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    });

    worksheet.getCell("A1").value = `LS${priority}`;
    worksheet.getCell("A1").font = { bold: true };
    worksheet.getCell("A1").border = thinBorder;
    worksheet.getCell("B1").value = "Ordem";
    worksheet.getCell("B1").font = { bold: true };
    worksheet.getCell("B1").border = thinBorder;
    worksheet.getCell("C1").value = orderNumber;
    worksheet.getCell("C1").border = thinBorder;
    worksheet.getCell("D1").value = "Destino";
    worksheet.getCell("D1").font = { bold: true };
    worksheet.getCell("D1").border = thinBorder;
    worksheet.getCell("E1").value = municipality;
    worksheet.getCell("E1").border = thinBorder;

    const tableHeaderRow = worksheet.getRow(3);
    tableHeaderRow.values = [
      "Caixa",
      "SKU",
      "Posição",
      "Qtd - MIL",
      "Case ID",
      "Código de Barras",
    ];
    tableHeaderRow.font = { bold: true };
    tableHeaderRow.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    const sortedData = [...orderData].sort((a, b) => {
      // 1. Primary Sort: Box Type
      const typeA = getBoxTypeFromDb(a?.item.toString());
      const typeB = getBoxTypeFromDb(b?.item.toString());
      const typeComparison = typeA.localeCompare(typeB);

      if (typeComparison !== 0) {
        return typeComparison;
      }

      // 2. Secondary Sort: SKU
      const skuA = String(a?.item || "");
      const skuB = String(b?.item || "");
      const skuComparison = skuA.localeCompare(skuB, undefined, {
        numeric: true,
      });

      if (skuComparison !== 0) {
        return skuComparison;
      }

      // 3. Tertiary Sort: Location
      const locA = String(a?.location || "");
      const locB = String(b?.location || "");

      return locA.localeCompare(locB, undefined, { numeric: true });
    });

    for (let i = 0; i < sortedData.length; i++) {
      const item = sortedData[i];
      const rowIndex = i + 4;
      const row = worksheet.addRow({
        bType: getBoxTypeFromDb(item?.item.toString()),
        sku: item?.item || "",
        pos: item?.location || "",
        qty: parseInt(item?.quantity) || "",
        caseId: item?.caseId || "",
        barcode: "",
      });

      row.height = 40;

      row.eachCell((cell) => {
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        cell.border = thinBorder;
      });

      const barcodePngBuffer = await bwipjs.toBuffer({
        bcid: "code128",
        text: item?.caseId || "",
        scale: 3,
        height: 8,
        includeText: true,
        textalign: "center",
      });

      const imageId = workbook.addImage({
        buffer: barcodePngBuffer,
        extension: "png",
      });

      worksheet.addImage(imageId, {
        tl: {
          col: 5.3,
          row: rowIndex - 1 + 0.22,
        },
        ext: { width: 175, height: 35 },
      });
    }

    try {
      await workbook.xlsx.writeFile(path.join(__dirname, "..", "Test.xlsx"));
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
);

// Window control handlers
ipcMain.on("window-minimize", () => {
  win?.minimize();
});

ipcMain.on("window-maximize", () => {
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on("window-close", () => {
  win?.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
