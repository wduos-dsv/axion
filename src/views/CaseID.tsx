import { useState } from "react";

interface printerInfo {
  printer: string;
}

export default function CaseID({ printer }: printerInfo) {
  const [priority, setPriority] = useState(1);
  const [selectedMunicipality, setSelectedMunicipality] = useState<
    "Itajaí" | "Cachoeirinha" | "Passo Fundo"
  >("Itajaí");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const generateCaseID = async () => {
    setDisplayStatus("awaiting");
    setDisplayStatusMessage("Processando...");

    if (!printer) {
      setDisplayStatus("error");
      setDisplayStatusMessage(
        "Por favor, selecione uma impressora de destino!",
      );

      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (window as any).ipcRenderer.invoke(
      "generate-case-id",
      priority,
      selectedMunicipality,
      pickDetailFilePath,
    );

    if (result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const printResult = await (window as any).ipcRenderer.invoke(
        "print-html-content",
        result.html,
        printer,
      );

      if (printResult.success) {
        setDisplayStatus("success");
        setDisplayStatusMessage(
          `Documento impresso com sucesso! Há ${result.fullAmount} pallets full neste pedido.`,
        );
      } else {
        setDisplayStatus("error");
        setDisplayStatusMessage(`Erro na impressão: ${printResult.error}`);
      }
    } else {
      setDisplayStatus("error");
      setDisplayStatusMessage(`Erro ao gerar dados: ${result.error}`);
    }
  };

  return (
    <div>
      <h2 className="view-title">Planilha de Picking por Case ID</h2>
      <small className="view-subtitle">Número da LS</small>
      <input
        type="number"
        value={priority}
        min={1}
        max={5}
        onChange={(event) => setPriority(parseInt(event.target.value) || 1)}
      />

      <small className="view-subtitle">Município</small>
      <div className="flex-btns">
        <button
          type="button"
          onClick={() => setSelectedMunicipality("Itajaí")}
          className={selectedMunicipality === "Itajaí" ? "active" : ""}
        >
          Itajaí
        </button>

        <button
          type="button"
          onClick={() => setSelectedMunicipality("Cachoeirinha")}
          className={selectedMunicipality === "Cachoeirinha" ? "active" : ""}
        >
          Cachoeirinha
        </button>

        <button
          type="button"
          onClick={() => setSelectedMunicipality("Passo Fundo")}
          className={selectedMunicipality === "Passo Fundo" ? "active" : ""}
        >
          Passo Fundo
        </button>
      </div>

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
        onClick={() => generateCaseID()}
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
