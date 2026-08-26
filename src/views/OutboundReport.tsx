import { useState } from "react";

interface printerInfo {
  printerPort: number;
  printerIP: string;
}

export default function OutboundReport({
  printerPort,
  printerIP,
}: printerInfo) {
  const [pickDetailFilePath, setPickDetailFilePath] = useState("");

  const [displayStatus, setDisplayStatus] = useState<
    "none" | "success" | "error" | "awaiting"
  >("none");
  const [displayStatusMessage, setDisplayStatusMessage] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleReadPickDetailFile = async (file: any) => {
    if (!file) {
      setPickDetailFilePath("");
      return;
    }

    try {
      const filePath = file.path;
      if (!filePath) {
        throw new Error("Caminho do arquivo não encontrado.");
      }

      setPickDetailFilePath(file.path);
      return;
    } catch (error) {
      setDisplayStatus("error");
      setDisplayStatusMessage(`${error}`);
    }
  };

  const generateReport = async () => {
    setDisplayStatus("awaiting");

    if (!printerIP || !printerPort) {
      setDisplayStatus("error");
      setDisplayStatusMessage("Por favor, configure a impressora Zebra!");

      return;
    }

    try {
      const config = {
        ip: printerIP,
        port: printerPort,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "generate-report",
        pickDetailFilePath,
        config,
      );

      if (result.success) {
        setDisplayStatus("success");
        setDisplayStatusMessage("Impressão do report concluída!");
      } else {
        setDisplayStatus("error");
        setDisplayStatusMessage(`Erro ao gerar report: ${result.error}`);
      }
    } catch (error) {
      setDisplayStatus("error");
      setDisplayStatusMessage(`Erro de comunicação: ${error}`);
    }
  };

  return (
    <div>
      <h2 className="view-title">Report de Transferência</h2>
      <small className="view-subtitle">Arquivo do Pick Detail</small>
      <input
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(event) => handleReadPickDetailFile(event.target.files?.[0])}
      />

      <button
        className={
          displayStatus === "awaiting"
            ? "main-process-btn disabled"
            : "main-process-btn"
        }
        onClick={() => generateReport()}
        disabled={displayStatus === "awaiting"}
      >
        Iniciar Impressão
      </button>
      {displayStatus === "success" ? (
        <small className="mrg-top-3 text-xs center green">
          {displayStatusMessage}
        </small>
      ) : displayStatus === "error" ? (
        <small className="mrg-top-3 text-xs center err">
          {displayStatusMessage}
        </small>
      ) : displayStatus === "awaiting" ? (
        <small className="mrg-top-3 text-xs center dim hold">Aguarde...</small>
      ) : null}
    </div>
  );
}
