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

function genReportLabel(
  lpn: string,
  items: Array<{ item: string; quantity?: number }>,
): string {
  // Split items into pairs (rows of 2 items side by side)
  const rows: Array<{
    first?: { item: string; quantity?: number };
    second?: { item: string; quantity?: number };
  }> = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push({
      first: items[i],
      second: items[i + 1],
    });
  }

  // Generate ZPL commands for each populated row slot (up to 7 rows supported by the label template)
  let tableRowsZpl = "";
  rows.forEach((row, rowIndex) => {
    // Y offsets for left and right columns based on your fixed row spacing (~35 units apart)
    const ySku = 96 + rowIndex * 35;
    const yQty = 94 + rowIndex * 35;

    if (row.first) {
      tableRowsZpl += `^FT53,${ySku}^A0N,28,30^FH\\^CI28^FD${row.first.item}^FS^CI27^`;
      tableRowsZpl += `^FT231,${yQty}^A0N,28,30^FH\\^CI28^FD${row.first.quantity ?? ""}^FS^CI27^`;
    }
    if (row.second) {
      tableRowsZpl += `^FT437,${ySku}^A0N,28,30^FH\\^CI28^FD${row.second.item}^FS^CI27^`;
      tableRowsZpl += `^FT614,${yQty}^A0N,28,30^FH\\^CI28^FD${row.second.quantity ?? ""}^FS^CI27^`;
    }
  });

  return `^XA~TA000~JSN^LT0^MNW^MTT^LH0,0^PR4,4~SD10^CI27^MMT^PW815^LL416^LS0^FT53,56^A0N,28,30^FH\\^CI28^FDSKU^FS^CI27^FO29,18^GB772,381,6^FS^FO651,338^GFA,353,900,20,:Z64:eJyN08GRhSAMBuA4HDhaAqVYGtxeGa8VOtgS1hI4cmDIhj/4jDvM7DKK8ulICJHofy0wc6IoPWcZcpHukMG5DcLwY9XBqrXuYY1o43Ma77D+sDeMiRwmgn0vbLZEXs61TU4jemMen5JLpp3n8pyas7YhNMQW+pUHfe9pETbWejRjydpRSLNXKIpVWJtxd4p1HNY4LSzLLVJq7FxYCV1T+ofVXSx/rKmxuy22sUnVi6XbxsrEXreNnZUHT6swx1+aUrFtYW7azDfMa0UZ6xJyIXwAZXTt+Yn4flmARWs5aPIx2bS0MFT6qZNdtbuwOv+IoCnVf4F2lIc1lFuju/oW7QeGiZHI:B182^FT47,359^A0N,28,28^FH\\^CI28^FD${lpn}^FS^CI27^FT48,377^A0N,17,18^FH\\^CI28^FDReport de Transferencia^FS^CI27^FO48,326^GB734,0,3^FS^FT231,56^A0N,28,30^FH\\^CI28^FDQTD^FS^CI27^FO411,37^GB0,270,3^FS^FO223,40^GB0,268,2^FS^FO47,65^GB341,0,2^FS^FT437,56^A0N,28,30^FH\\^CI28^FDSKU^FS^CI27^FT615,56^A0N,28,30^FH\\^CI28^FDQTD^FS^CI27^FO607,40^GB0,268,2^FS^FO431,65^GB341,0,2^FS^${tableRowsZpl}^PQ1,0,1,Y^XZ`;
}

function getBoxTypesDatabasePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "box-types.json");
  } else {
    return path.join(__dirname, "../resources/box-types.json");
  }
}

async function excelFileToObjectArray(path: string) {
  const excelFileData: Array<any> = [];

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return;
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

    return excelFileData;
  } catch (error) {
    return;
  }
}

const calculatePalletsAndLeftovers = (totalBoxes: number, capacity: number) => {
  const roundedBoxes = Math.round(totalBoxes * 1000) / 1000;
  const pallets = Math.floor(roundedBoxes / capacity);
  const boxesLeft = Math.round((roundedBoxes % capacity) * 10) / 10;
  return { pallets, boxesLeft: Math.floor(boxesLeft) };
};

ipcMain.handle("get-printers", async () => {
  if (!win) return [];
  return await win.webContents.getPrintersAsync();
});

ipcMain.handle(
  "generate-case-id",
  async (_, priority, municipality, filePath) => {
    const fileData = (await excelFileToObjectArray(filePath)) ?? [];

    if (fileData.length === 0) {
      return {
        success: false,
        error: "Ocorreu um erro ao processar o arquivo.",
      };
    }

    if (fileData.length > 100) {
      return {
        success: false,
        error:
          "Limite de linhas excedido.  Verifique se o arquivo selecionado é uma planilha de Pick Detail.",
      };
    }

    const orderNumber = fileData[0]?.["Order Number"] || undefined;

    if (!orderNumber) {
      return {
        success: false,
        error: `Campo "Order Number" não encontrado! Verifique se o arquivo selecionado é uma planilha de Pick Detail.`,
      };
    }

    const dbPath = getBoxTypesDatabasePath();
    let db: Array<{ SKU: string; Type: string }> = [];

    const getBoxTypeFromDb = (sku: string) => {
      const foundBox: any = db.find((box: any) => box.SKU === sku);
      return foundBox ? foundBox.Type : "";
    };

    try {
      const fileData = fs.readFileSync(dbPath, "utf-8");
      db = JSON.parse(fileData);
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }

    const orderData: Array<{
      item: string | number;
      boxType: string;
      location: string | number;
      quantity: number;
      caseId: string | number;
    }> = [];

    let fullAmount = 0;

    let boxTotalBoxes = 0;
    let sleeveTotalBoxes = 0;
    let nineTotalBoxes = 0;
    let fumoTotalBoxes = 0;

    const getBaseGroup = (rawType: string) => {
      const trimmed = rawType.trim().toUpperCase();
      const firstSpace = trimmed.indexOf(" ");
      return firstSpace === -1 ? trimmed : trimmed.substring(0, firstSpace);
    };

    fileData.forEach((spreadsheetRow) => {
      const quantityInRow = parseFloat(spreadsheetRow?.Quantity) || 0;
      const hasCartonType = spreadsheetRow?.["Carton Type"];
      const sku = spreadsheetRow?.Item || "";
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
        const dbType = getBoxTypeFromDb(sku);
        const group = getBaseGroup(dbType);

        switch (group) {
          case "BOX":
            boxTotalBoxes += quantityInRow / 10;
            break;
          case "SLIVE":
            sleeveTotalBoxes += quantityInRow / 10;
            break;
          case "NINE":
            nineTotalBoxes += quantityInRow / 10;
            break;
          case "FUMO":
            fumoTotalBoxes += quantityInRow / 11.7;
            break;
        }

        orderData.push({
          item: spreadsheetRow?.Item || "",
          boxType: dbType,
          location: spreadsheetRow?.Location || "",
          quantity: quantityInRow,
          caseId: spreadsheetRow?.["Case ID"] || "",
        });
      }
    });

    const boxCalc = calculatePalletsAndLeftovers(boxTotalBoxes, 40);
    const sleeveCalc = calculatePalletsAndLeftovers(sleeveTotalBoxes, 40);
    const nineCalc = calculatePalletsAndLeftovers(nineTotalBoxes, 36);
    const fumoCalc = calculatePalletsAndLeftovers(fumoTotalBoxes, 18);

    const boxPalletTotal = boxCalc.pallets;
    const boxBoxesLeft = boxCalc.boxesLeft;
    const slivePalletTotal = sleeveCalc.pallets;
    const sliveBoxesLeft = sleeveCalc.boxesLeft;
    const ninePalletTotal = nineCalc.pallets;
    const nineBoxesLeft = nineCalc.boxesLeft;
    const fumoPalletTotal = fumoCalc.pallets;
    const fumoBoxesLeft = fumoCalc.boxesLeft;

    const sortedData = [...orderData].sort((a, b) => {
      const typeA = a?.boxType;
      const typeB = b?.boxType;
      const typeComparison = typeA.localeCompare(typeB);

      if (typeComparison !== 0) {
        return typeComparison;
      }

      const skuA = String(a?.item || "");
      const skuB = String(b?.item || "");
      const skuComparison = skuA.localeCompare(skuB, undefined, {
        numeric: true,
      });

      if (skuComparison !== 0) {
        return skuComparison;
      }

      const locA = String(a?.location || "");
      const locB = String(b?.location || "");

      return locA.localeCompare(locB, undefined, { numeric: true });
    });

    const processedRowsHtml: string[] = [];

    for (let i = 0; i < sortedData.length; i++) {
      const item = sortedData[i];
      const boxType = item.boxType || "";
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
          .header-table, .data-table, .sum-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .header-table td, .header-table th,
          .data-table td, .data-table th,
          .sum-table td, .sum-table th {
            border: 1px solid #000;
            padding: 6px 8px;
            text-align: center;
            vertical-align: middle;
          }
          .header-table th, .data-table th, .sum-table th {
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

        <table class="sum-table">
          <thead>
            <tr>
              <th colspan="2">BOX</th>
              <th colspan="2">SLIVE</th>
              <th colspan="2">NINE</th>
              <th colspan="2">FUMO</th>
            </tr>
            <tr>
              <th>Pallets</th>
              <th>Sobra CX</th>
              <th>Pallets</th>
              <th>Sobra CX</th>
              <th>Pallets</th>
              <th>Sobra CX</th>
              <th>Pallets</th>
              <th>Sobra CX</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>${boxPalletTotal}</th>
              <td>${boxBoxesLeft}</td>
              <th>${slivePalletTotal}</th>
              <td>${sliveBoxesLeft}</td>
              <th>${ninePalletTotal}</th>
              <td>${nineBoxesLeft}</td>
              <th>${fumoPalletTotal}</th>
              <td>${fumoBoxesLeft}</td>
            </tr>
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

ipcMain.handle("generate-report", async (_, filePath) => {
  const fileData = (await excelFileToObjectArray(filePath)) ?? [];

  if (fileData.length === 0) {
    return {
      success: false,
      error: "Ocorreu um erro ao processar o arquivo.",
    };
  }

  try {
    const labelsMap = new Map<
      string,
      { lpn: string; items: Array<{ item: string; quantity: number }> }
    >();

    fileData.forEach((row) => {
      const lpnKey = row?.LPN;
      const itemCode = row?.Item;
      const rowQuantity = parseFloat(row?.Quantity) || 0;

      if (!lpnKey || !itemCode) return;

      if (!labelsMap.has(lpnKey)) {
        labelsMap.set(lpnKey, { lpn: lpnKey, items: [] });
      }

      const lpnGroup = labelsMap.get(lpnKey)!;

      const existingItem = lpnGroup.items.find((i) => i.item === itemCode);

      if (existingItem) {
        existingItem.quantity += rowQuantity;
      } else {
        lpnGroup.items.push({
          item: itemCode,
          quantity: rowQuantity,
        });
      }
    });

    const labels = Array.from(labelsMap.values()).sort((a, b) =>
      a.lpn.localeCompare(b.lpn, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
    return { success: true, labels: labels };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle("print-full-report", async (_, config) => {
  try {
    const ip = config.ip || "10.55.22.240";
    const port = config.port || 9100;
    const data = config?.data;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        success: false,
        error: "Sem dados extraídos do Pick Detail para impressão.",
      };
    }

    for (const labelSet of data) {
      const lpn = labelSet.lpn;
      const items = labelSet.items || [];

      const zpl = genReportLabel(lpn, items);
      await sendZplOverTcp(ip, port, zpl, 5000);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle("print-report-label", async (_, config) => {
  try {
    const ip = config.ip || "10.55.22.240";
    const port = config.port || 9100;
    const data = config?.data;

    if (!data || data.length === 0) {
      return {
        success: false,
        error: "Sem dados extraídos do Pick Detail para impressão.",
      };
    }

    const zpl = genReportLabel(data.lpn, data.items);
    await sendZplOverTcp(ip, port, zpl, 5000);

    return { success: true };
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
