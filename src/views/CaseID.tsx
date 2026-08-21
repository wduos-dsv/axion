import { useState } from "react";
import * as XLSX from "xlsx";

interface printerInfo {
  printer: string;
}

export default function CaseID({ printer }: printerInfo) {
  const [priority, setPriority] = useState(1);
  const [selectedMunicipality, setSelectedMunicipality] = useState<
    "Itajaí" | "Cachoeirinha" | "Passo Fundo"
  >("Itajaí");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pickDetailFile, setPickDetailFile] = useState<any[]>([]);

  const [displayStatus, setDisplayStatus] = useState<
    "none" | "success" | "error" | "awaiting"
  >("none");
  const [displayStatusMessage, setDisplayStatusMessage] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleReadPickDetailFile = (file: any) => {
    if (!file) {
      setPickDetailFile([]);
      return;
    }

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const data = loadEvent.target?.result;
      if (!data) return;

      try {
        const uint8Array = new Uint8Array(data as ArrayBuffer);
        const workbook = XLSX.read(uint8Array, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        setPickDetailFile(parsedData);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        setDisplayStatus("error");
        setDisplayStatusMessage(
          "Erro ao ler o arquivo Excel. Verifique se o arquivo está corrompido.",
        );
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const generateCaseID = async () => {
    if (!printer) {
      setDisplayStatus("error");
      setDisplayStatusMessage("Selecione uma impressora de destino");
      return;
    }

    // read order number directly from the parsed file so it's immediately available
    const orderNumber = pickDetailFile[0]?.["Order Number"] || "";

    const orderData: Array<{
      item: string | number | undefined;
      location: string | number | undefined;
      quantity: string | number | undefined;
      caseId: string | number | undefined;
    }> = [];

    pickDetailFile.forEach((spreadsheetRow) => {
      orderData.push({
        item: parseInt(spreadsheetRow?.Item) || "",
        location: spreadsheetRow?.Location || "",
        quantity: parseInt(spreadsheetRow?.Quantity) || "",
        caseId: spreadsheetRow?.["Case ID"] || "",
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (window as any).ipcRenderer.invoke(
      "generate-case-id",
      orderNumber,
      priority,
      selectedMunicipality,
      orderData,
      printer,
    );

    if (result.success) {
      setDisplayStatus("success");
      setDisplayStatusMessage("Planilha gerada com sucesso!");
    } else {
      setDisplayStatus("error");
      setDisplayStatusMessage(`Erro ao salvar planilha: ${result.error}`);
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
        Iniciar Processo
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
