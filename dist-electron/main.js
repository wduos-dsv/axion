import { ipcMain, app, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as net from "node:net";
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    frame: false,
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    height: 500,
    minHeight: 500,
    width: 700,
    minWidth: 700,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.removeMenu();
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
function sendZplOverTcp(ip, port, zplData, timeoutMs = 5e3) {
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
            "Tempo de conexão esgotado. Verifique a rede ou configurações da impressora."
          )
        );
      });
    }
    client.on("close", () => {
      resolve();
    });
  });
}
function genExpLabelZpl(cfg, currentIdx, totalLabelsFormatted) {
  const barcodeCounter = String(currentIdx).padStart(3, "0");
  const printCounter = String(currentIdx).padStart(2, "0");
  return `^XA~TA000~JSN^LT0^MNW^MTT^LH0,0^PR4,4~SD10^CI27^MMT^PW815^LL416^LS0^FT48,87^A0N,62,61^FH^CI28^FDEXPEDIÇÃO:^FS^CI27^FO29,18^GB772,381,6^FS^FO658,340^GFA,305,688,16,:Z64:eJx90c2NwyAQBeCxfMiREiiF0vB2RilOB0R7QVrE5L2ZJLZQvBwsPgvmD5H/V1QdsipWg1JL2JVAj49rpHUTyWb7uCu3PZuLiJqHe4d3P/rVVRYtcTKTei3wag7u3GDklNu7Vuzo9eUOs6XFHWcPCcN69t6CGVHEqwPiyQ2XEQJR3R1OJw8Ug8OXVhSf68nL4V/6R3eMBF7QKd5hO7yz6U3vJ6PV/MA44HXy7eX0h3HAgVOj1Z3oYLbh4jcfaIuXFhpXhntM7vRAiu5udD9cab5Wcxe6fuxRivc9ryc4jW7G:3FF8^FT350,87^A0N,62,61^FH^CI28^FD${cfg.municipality.toUpperCase()}^FS^CI27^FT48,158^A0N,51,51^FH^CI28^FDDATA:^FS^CI27^FT177,158^A0N,51,51^FH^CI28^FD${cfg.expDate}^FS^CI27^FT48,364^A0N,46,46^FH^CI28^FDEXP${cfg.order}${barcodeCounter}ARQ^FS^CI27^BY3,3,69^FT48,318^BCN,,N,N^FH^FD>:EXP${cfg.order}${barcodeCounter}ARQ^FS^FT512,200^A0N,102,112^FH^CI28^FD${printCounter}/${totalLabelsFormatted}^FS^CI27^FT48,210^A0N,51,51^FH^CI28^FDPEDIDO:^FS^CI27^FT229,210^A0N,51,51^FH^CI28^FD${cfg.order}^FS^CI27^PQ1,0,1,Y^XZ`;
}
function genExpLabelRepackZpl(cfg, totalLabelsFormatted) {
  const repackI = cfg.totalLabels + 1;
  const repackStr = String(repackI).padStart(2, "0");
  const repackBarcode = String(repackI).padStart(3, "0");
  return `^XA~TA000~JSN^LT0^MNW^MTT^LH0,0^PR4,4~SD10^CI27^MMT^PW815^LL416^LS0^FT48,87^A0N,62,61^FH^CI28^FDEXPEDIÇÃO:^FS^CI27^FO29,18^GB772,381,6^FS^FO658,340^GFA,305,688,16,:Z64:eJx90c2NwyAQBeCxfMiREiiF0vB2RilOB0R7QVrE5L2ZJLZQvBwsPgvmD5H/V1QdsipWg1JL2JVAj49rpHUTyWb7uCu3PZuLiJqHe4d3P/rVVRYtcTKTei3wag7u3GDklNu7Vuzo9eUOs6XFHWcPCcN69t6CGVHEqwPiyQ2XEQJR3R1OJw8Ug8OXVhSf68nL4V/6R3eMBF7QKd5hO7yz6U3vJ6PV/MA44HXy7eX0h3HAgVOj1Z3oYLbh4jcfaIuXFhpXhntM7vRAiu5udD9cab5Wcxe6fuxRivc9ryc4jW7G:3FF8^FT350,87^A0N,62,61^FH^CI28^FD${cfg.municipality.toUpperCase()}^FS^CI27^FT48,158^A0N,51,51^FH^CI28^FDDATA:^FS^CI27^FT177,158^A0N,51,51^FH^CI28^FD${cfg.expDate}^FS^CI27^FT48,364^A0N,46,46^FH^CI28^FDREPACK${cfg.order}${repackBarcode}^FS^CI27^BY3,3,69^FT48,318^BCN,,N,N^FH^FD>:REPACK${cfg.order}${repackBarcode}^FS^FT512,200^A0N,102,112^FH^CI28^FD${repackStr}/${totalLabelsFormatted}^FS^CI27^FT48,210^A0N,51,51^FH^CI28^FDPEDIDO:^FS^CI27^FT229,210^A0N,51,51^FH^CI28^FD${cfg.order}^FS^CI27^PQ1,0,1,Y^XZ`;
}
function genExpOrderOnlyZpl(cfg, totalLabelsFormatted) {
  return `^XA~TA000~JSN^LT0^MNW^MTT^LH0,0^PR4,4~SD10^CI27^MMT^PW815^LL416^LS0^FT48,87^A0N,62,61^FH^CI28^FDEXPEDIÇÃO:^FS^CI27^FO29,18^GB772,381,6^FS^FO658,340^GFA,305,688,16,:Z64:eJx90c2NwyAQBeCxfMiREiiF0vB2RilOB0R7QVrE5L2ZJLZQvBwsPgvmD5H/V1QdsipWg1JL2JVAj49rpHUTyWb7uCu3PZuLiJqHe4d3P/rVVRYtcTKTei3wag7u3GDklNu7Vuzo9eUOs6XFHWcPCcN69t6CGVHEqwPiyQ2XEQJR3R1OJw8Ug8OXVhSf68nL4V/6R3eMBF7QKd5hO7yz6U3vJ6PV/MA44HXy7eX0h3HAgVOj1Z3oYLbh4jcfaIuXFhpXhntM7vRAiu5udD9cab5Wcxe6fuxRivc9ryc4jW7G:3FF8^FT350,87^A0N,62,61^FH^CI28^FD${cfg.municipality.toUpperCase()}^FS^CI27^FT48,158^A0N,51,51^FH^CI28^FDDATA:^FS^CI27^FT177,158^A0N,51,51^FH^CI28^FD${cfg.expDate}^FS^CI27^FT48,364^A0N,46,46^FH^CI28^FD${cfg.order}^FS^CI27^BY3,3,69^FT48,318^BCN,,N,N^FH^FD>:${cfg.order}^FS^FT512,200^A0N,102,112^FH^CI28^FD00/${totalLabelsFormatted}^FS^CI27^FT48,210^A0N,51,51^FH^CI28^FDPEDIDO:^FS^CI27^FT229,210^A0N,51,51^FH^CI28^FD${cfg.order}^FS^CI27^PQ1,0,1,Y^XZ`;
}
ipcMain.handle("print-exp-full-range", async (_, config) => {
  try {
    const ip = config.ip || "10.55.22.240";
    const port = config.port || 9100;
    const totalLabelsFormatted = String(config.totalLabels).padStart(2, "0");
    for (let i = 1; i <= config.totalLabels; i++) {
      const zpl = genExpLabelZpl(config, i, totalLabelsFormatted);
      await sendZplOverTcp(ip, port, zpl);
    }
    if (config.repack === "Sim") {
      const zpl = genExpLabelRepackZpl(config, totalLabelsFormatted);
      await sendZplOverTcp(ip, port, zpl);
    }
    const finalZpl = genExpOrderOnlyZpl(config, totalLabelsFormatted);
    await sendZplOverTcp(ip, port, finalZpl, 0);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.on("window-minimize", () => {
  win == null ? void 0 : win.minimize();
});
ipcMain.on("window-maximize", () => {
  if (win == null ? void 0 : win.isMaximized()) {
    win.unmaximize();
  } else {
    win == null ? void 0 : win.maximize();
  }
});
ipcMain.on("window-close", () => {
  win == null ? void 0 : win.close();
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
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
