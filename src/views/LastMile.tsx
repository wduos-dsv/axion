import { useState } from "react";

interface PrinterInfo {
  printerPort: number;
  printerIP: string;
}

export default function LastMile({ printerPort, printerIP }: PrinterInfo) {
  const [shipmentOrderData, setShipmentOrderData] = useState<any[]>([]);
  const [waveList, setWaveList] = useState<any[]>([]);
  const [waveOnScreenIndex, setWaveOnScreenIndex] = useState(0);

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

        console.log("waveList", result.fileData);
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

  const handlePrint = async () => {
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
        route: waveList[waveOnScreenIndex],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "print-last-mile-labels",
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
      <small className="view-subtitle">Arquivo do Shipment Order</small>
      <input
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(event) =>
          handleReadShipmentOrderFile(event.target.files?.[0])
        }
      />

      {shipmentOrderData.length > 0 && (
        <>
          <small className="view-subtitle">Arquivo do Pick Detail</small>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) =>
              handleReadPickDetailFile(event.target.files?.[0])
            }
          />
        </>
      )}

      <button
        className={
          printStatus === "awaiting"
            ? "main-process-btn disabled"
            : "main-process-btn"
        }
        onClick={handlePrint}
        disabled={printStatus === "awaiting"}
      >
        Iniciar Impressão
      </button>
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
