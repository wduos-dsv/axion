import { useState } from "react";

interface PrinterInfo {
  printerPort: number;
  printerIP: string;
}

export default function LastMile({ printerPort, printerIP }: PrinterInfo) {
  const [shipmentOrderData, setShipmentOrderData] = useState<any[]>([]);
  const [waveList, setWaveList] = useState<any[]>([]);

  const [printStatus, setPrintStatus] = useState<
    "none" | "success" | "error" | "awaiting"
  >("none");
  const [printStatusMessage, setPrintStatusMessage] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleReadShipmentOrderFile = async (file: any) => {
    if (!file) {
      return;
    }

    try {
      const filePath = file.path;
      if (!filePath) {
        throw new Error("Caminho do arquivo não encontrado.");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "get-waves-from-shipment-order",
        file.path,
      );

      if (result.success) {
        setShipmentOrderData(result.waves);
      } else {
        setPrintStatus("error");
        setPrintStatusMessage(`Erro! ${result.error}`);
      }
    } catch (error) {
      setPrintStatus("error");
      setPrintStatusMessage(
        `Erro ao processar o arquivo do Shipment Order: ${error}`,
      );
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleReadPickDetailFile = async (file: any) => {
    if (!file) {
      return;
    }

    try {
      const filePath = file.path;
      if (!filePath) {
        throw new Error("Caminho do arquivo não encontrado.");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "get-data-from-pick-detail",
        file.path,
        shipmentOrderData,
      );

      if (result.success) {
        setWaveList(result.fileData);
      } else {
        setPrintStatus("error");
        setPrintStatusMessage(`Erro! ${result.error}`);
      }
    } catch (error) {
      setPrintStatus("error");
      setPrintStatusMessage(
        `Erro ao processar o arquivo do Pick Detail: ${error}`,
      );
    }
  };

  const handlePrint = async (waveIndex: number) => {
    setPrintStatus("awaiting");

    if (!waveList || !shipmentOrderData) {
      setPrintStatus("error");
      setPrintStatusMessage(
        "Selecione os arquivos do Shipment Order e Pick Detail antes de imprimir.",
      );
      return;
    }

    try {
      const config = {
        ip: printerIP,
        port: printerPort,
        route: waveList[waveIndex],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "print-last-mile-wave",
        config,
      );

      if (result.success) {
        setPrintStatus("success");
        setPrintStatusMessage(`Impressão enviada com sucesso!`);
      } else {
        setPrintStatus("error");
        setPrintStatusMessage(`Erro! ${result.error}`);
      }
    } catch (error) {
      setPrintStatus("error");
      setPrintStatusMessage(`Erro de comunicação: ${error}`);
    }
  };

  return (
    <div>
      <h2 className="view-title">Impressão de Rotas Last Mile</h2>
      <div className="flex-wrapper">
        <small className="view-subtitle">Arquivo do Shipment Order</small>
        {shipmentOrderData.length > 0 && (
          <small className="view-subtitle">Arquivo do Pick Detail</small>
        )}
      </div>
      <div className="flex-wrapper">
        <input
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) =>
            handleReadShipmentOrderFile(event.target.files?.[0])
          }
        />
        {shipmentOrderData.length > 0 && (
          <>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) =>
                handleReadPickDetailFile(event.target.files?.[0])
              }
            />
          </>
        )}
      </div>

      {waveList.length > 0 && (
        <>
          <table className="mrg-top-2">
            <thead>
              <tr>
                <th scope="col">Rota</th>
                <th scope="col">Ordens</th>
                <th scope="col">Imprimir</th>
              </tr>
            </thead>
            <tbody>
              {waveList.map((wave, index) => (
                <tr key={index}>
                  <td>{wave.route}</td>
                  <td>{wave.orders.length}</td>
                  <td>
                    <button
                      className={
                        printStatus === "awaiting"
                          ? "table-btn disabled"
                          : "table-btn"
                      }
                      onClick={() => {
                        handlePrint(index);
                      }}
                      disabled={printStatus === "awaiting"}
                    >
                      <svg viewBox="0 0 24 24">
                        <rect x="5" width="14" height="5" />
                        <rect x="6" y="15" width="12" height="9" />
                        <path d="M21,7H3a3,3,0,0,0-3,3V20H4V13H20v7h4V10A3,3,0,0,0,21,7Zm-2,4H15V9h4Z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ textAlign: "left" }}>
                <th scope="row" className="accent">
                  {waveList.length} ROTAS
                </th>
                <th scope="row" className="accent">
                  {waveList.reduce((sum, wave) => sum + wave.orders.length, 0)}{" "}
                  REMESSAS
                </th>
              </tr>
            </tfoot>
          </table>
        </>
      )}

      {printStatus === "success" ? (
        <small className="mrg-top-3 text-xs center green">
          {printStatusMessage}
        </small>
      ) : printStatus === "error" ? (
        <small className="mrg-top-3 text-xs center err">
          {printStatusMessage}
        </small>
      ) : printStatus === "awaiting" ? (
        <small className="mrg-top-3 text-xs center dim hold">Aguarde...</small>
      ) : null}
    </div>
  );
}
