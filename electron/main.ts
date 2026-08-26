import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "fs";
import ExcelJS from "exceljs";
import * as net from "node:net";

const require = createRequire(import.meta.url);
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
    height: 550,
    minHeight: 550,
    width: 750,
    minWidth: 750,
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

function genReportLabel(uniqueCode?: string, counter?: number): string {
  return `^XA~TA000~JSN^LT0^MNW^MTT^LH0,0^PR4,4~SD10^CI27^MMT^PW815^LL416^LS0^FT53,56^A0N,28,30^FH\^CI28^FDSKU^FS^CI27^FO29,18^GB772,381,6^FS^FO651,338^GFA,353,900,20,:Z64:eJyN08GRhSAMBuA4HDhaAqVYGtxeGa8VOtgS1hI4cmDIhj/4jDvM7DKK8ulICJHofy0wc6IoPWcZcpHukMG5DcLwY9XBqrXuYY1o43Ma77D+sDeMiRwmgn0vbLZEXs61TU4jemMen5JLpp3n8pyas7YhNMQW+pUHfe9pETbWejRjydpRSLNXKIpVWJtxd4p1HNY4LSzLLVJq7FxYCV1T+ofVXSx/rKmxuy22sUnVi6XbxsrEXreNnZUHT6swx1+aUrFtYW7azDfMa0UZ6xJyIXwAZXTt+Yn4flmARWs5aPIx2bS0MFT6qZNdtbuwOv+IoCnVf4F2lIc1lFuju/oW7QeGiZHI:B182^FT47,359^A0N,28,28^FH\^CI28^FDREC12345001ARQ^FS^CI27^FT48,377^A0N,17,18^FH\^CI28^FDReport de Transferencia^FS^CI27^FO48,326^GB734,0,3^FS^FT231,56^A0N,28,30^FH\^CI28^FDQTD^FS^CI27^FO411,37^GB0,270,3^FS^FO223,40^GB0,268,2^FS^FO47,65^GB341,0,2^FS^FT53,96^A0N,28,30^FH\^CI28^FD10215610^FS^CI27^FT53,132^A0N,28,30^FH\^CI28^FD10215610^FS^CI27^FT53,167^A0N,28,30^FH\^CI28^FD10215610^FS^CI27^FT53,202^A0N,28,30^FH\^CI28^FD10215610^FS^CI27^FT53,237^A0N,28,30^FH\^CI28^FD10215610^FS^CI27^FT53,273^A0N,28,30^FH\^CI28^FD10215610^FS^CI27^FT53,308^A0N,28,30^FH\^CI28^FD10215610^FS^CI27^FT231,94^A0N,28,30^FH\^CI28^FD10^FS^CI27^FT230,132^A0N,28,30^FH\^CI28^FD20^FS^CI27^FT231,167^A0N,28,30^FH\^CI28^FD30^FS^CI27^FT230,202^A0N,28,30^FH\^CI28^FD40^FS^CI27^FT230,237^A0N,28,30^FH\^CI28^FD50^FS^CI27^FT230,273^A0N,28,30^FH\^CI28^FD60^FS^CI27^FT230,308^A0N,28,30^FH\^CI28^FD70^FS^CI27^FT437,56^A0N,28,30^FH\^CI28^FDSKU^FS^CI27^FT615,56^A0N,28,30^FH\^CI28^FDQTD^FS^CI27^FO607,40^GB0,268,2^FS^FO431,65^GB341,0,2^FS^FT437,96^A0N,28,30^FH\^CI28^FD10226446^FS^CI27^FT437,132^A0N,28,30^FH\^CI28^FD10226446^FS^CI27^FT437,167^A0N,28,30^FH\^CI28^FD10226446^FS^CI27^FT437,202^A0N,28,30^FH\^CI28^FD10226446^FS^CI27^FT437,237^A0N,28,30^FH\^CI28^FD10226446^FS^CI27^FT437,273^A0N,28,30^FH\^CI28^FD10226446^FS^CI27^FT437,308^A0N,28,30^FH\^CI28^FD10226446^FS^CI27^FT614,96^A0N,28,30^FH\^CI28^FD80^FS^CI27^FT614,132^A0N,28,30^FH\^CI28^FD90^FS^CI27^FT615,167^A0N,28,30^FH\^CI28^FD100^FS^CI27^FT614,202^A0N,28,30^FH\^CI28^FD110^FS^CI27^FT614,237^A0N,28,30^FH\^CI28^FD120^FS^CI27^FT614,273^A0N,28,30^FH\^CI28^FD130^FS^CI27^FT614,308^A0N,28,30^FH\^CI28^FD140^FS^CI27^PQ1,0,1,Y^XZ`;
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
      const hasCartonType = spreadsheetRow?.["Carton Type"];
      const isPalletFull = () => {
        if (hasCartonType) {
          return (
            spreadsheetRow?.["Carton Type"] === "PALLET" ||
            (spreadsheetRow?.["Carton Type"] === "SACO" &&
              quantityInRow === 400)
          );
        } else {
          return quantityInRow === 400 || quantityInRow === 360;
        }
      };

      if (isPalletFull()) {
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

ipcMain.handle("generate-report", async (_, filePath, config) => {
  // const ip = config.ip || "10.55.22.240";
  // const port = config.port || 9100;

  const excelFileData: Array<any> = [];
  const labelsMap = new Map<
    string,
    { lpn: string; items: Array<{ item: string; quantity: number }> }
  >();

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

    // Grouping by LPN and aggregating items + summing quantities
    excelFileData.forEach((row) => {
      const lpnKey = row?.LPN;
      const itemCode = row?.Item;
      const rowQuantity = parseFloat(row?.Quantity) || 0;

      if (!lpnKey || !itemCode) return; // Skip if LPN or Item is missing

      // 1. Ensure LPN group exists in the Map
      if (!labelsMap.has(lpnKey)) {
        labelsMap.set(lpnKey, { lpn: lpnKey, items: [] });
      }

      const lpnGroup = labelsMap.get(lpnKey)!;

      // 2. Check if the item already exists in this LPN's items array
      const existingItem = lpnGroup.items.find((i) => i.item === itemCode);

      if (existingItem) {
        // If it exists, sum the quantities
        existingItem.quantity += rowQuantity;
      } else {
        // If it doesn't exist, add it as a new entry
        lpnGroup.items.push({
          item: itemCode,
          quantity: rowQuantity,
        });
      }
    });

    // Convert Map back to an array and sort by LPN name alphabetically
    const labels = Array.from(labelsMap.values()).sort((a, b) =>
      a.lpn.localeCompare(b.lpn, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

    // const zpl = genReportLabel();
    // await sendZplOverTcp(ip, port, zpl, 0);
    return { success: true, labels: labels };
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
