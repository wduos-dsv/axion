import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
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
      nodeIntegration: false,
      contextIsolation: true,
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
/* function sendZplOverTcp(
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
} */

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
  async (_, priority, municipality, filePath) => {
    const excelFileData: Array<any> = [];

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        return { success: false, error: "Planilha vazia ou inválida." };
      }

      let headers: string[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          headers = (row.values as Array<any>).map((val) =>
            String(val || "").trim(),
          );
        } else {
          const rowObject: Record<string, any> = {};
          const values = row.values as Array<any>;
          headers.forEach((header, index) => {
            if (header) {
              rowObject[header] =
                values[index] !== undefined ? values[index] : "";
            }
          });
          excelFileData.push(rowObject);
        }
      });
    } catch (error) {
      return { success: false, error: String(error) };
    }

    const orderNumber = excelFileData[0]?.["Order Number"] || "";
    let fullAmount = 0;

    const orderData: Array<{
      item: number;
      location: string | number;
      quantity: number;
      caseId: string | number;
    }> = [];

    excelFileData.forEach((spreadsheetRow) => {
      const quantityInRow = parseInt(spreadsheetRow?.Quantity);
      const isPalletFull = quantityInRow === 400 || quantityInRow === 360;

      if (isPalletFull) {
        fullAmount++;
      } else {
        orderData.push({
          item: spreadsheetRow?.Item || "",
          location: spreadsheetRow?.Location || "",
          quantity: spreadsheetRow?.Quantity || "",
          caseId: spreadsheetRow?.["Case ID"] || "",
        });
      }
    });

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

    // Generate barcodes as base64 data URLs for HTML injection
    const processedRowsHtml: string[] = [];

    for (let i = 0; i < sortedData.length; i++) {
      const item = sortedData[i];
      const boxType = getBoxTypeFromDb(item?.item.toString());
      const sku = item?.item || "";
      const pos = item?.location || "";
      const qty = item?.quantity || "";
      const caseId = item?.caseId || "";

      let barcodeDataUrl = "";
      try {
        const barcodePngBuffer = await bwipjs.toBuffer({
          bcid: "code128",
          text: caseId,
          scale: 3,
          height: 10,
          includeText: true,
          textalign: "center",
        });
        barcodeDataUrl = `data:image/png;base64,${barcodePngBuffer.toString("base64")}`;
      } catch (e) {
        console.error("Barcode generation error:", e);
      }

      processedRowsHtml.push(`
        <tr>
          <td>${boxType}</td>
          <td>${sku}</td>
          <td>${pos}</td>
          <td>${qty}</td>
          <td>${caseId}</td>
          <td><img src="${barcodeDataUrl}" class="barcode-img" alt="${caseId}" /></td>
        </tr>
      `);
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Picking - LS ${priority}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #000;
            margin: 0;
            padding: 0;
          }
          .header-table, .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .header-table td, .header-table th,
          .data-table td, .data-table th {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: center;
            vertical-align: middle;
          }
          .header-table th, .data-table th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .data-table tr {
            height: 40px;
          }
          .barcode-img {
            max-width: 160px;
            height: 35px;
            object-fit: contain;
          }
          .title {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="title">Picking por Case ID</div>
        
        <table class="header-table">
          <tr>
            <th>LS</th>
            <td>LS${priority}</td>
            <th>Ordem</th>
            <td>${orderNumber}</td>
            <th>Destino</th>
            <td>${municipality}</td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th>Caixa</th>
              <th>SKU</th>
              <th>Posição</th>
              <th>Qtd - MIL</th>
              <th>Case ID</th>
              <th>Código de Barras</th>
            </tr>
          </thead>
          <tbody>
            ${processedRowsHtml.join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    return {
      success: true,
      fullAmount: fullAmount,
      html: htmlContent,
    };
  },
);

ipcMain.handle("print-html-content", async (_, htmlContent, printerName) => {
  try {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`,
    );

    return new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printerName || undefined,
        },
        (success, failureReason) => {
          printWindow.close();
          if (success) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: failureReason });
          }
        },
      );
    });
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

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
