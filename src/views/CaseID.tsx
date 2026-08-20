import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

interface printerInfo {
  printerPort: number;
  printerIP: string;
}

export default function CaseID({ printerPort, printerIP }: printerInfo) {
  const [boxTypes, setBoxTypes] = useState([]);

  const [orderNumber, setOrderNumber] = useState("");
  const [priority, setPriority] = useState(1);
  const [selectedMunicipality, setSelectedMunicipality] = useState<
    "Itajaí" | "Cachoeirinha" | "Passo Fundo"
  >("Itajaí");
  const [pickDetailFile, setPickDetailFile] = useState<any[]>([]);

  const [displayStatus, setDisplayStatus] = useState<
    "none" | "success" | "error" | "awaiting"
  >("none");
  const [displayStatusMessage, setDisplayStatusMessage] = useState("");

  /* const handlePrint = async () => {
    setPrintStatus("awaiting");

    const trimmedOrder = orderNumber.trim();
    if (!trimmedOrder.match(/^\d{10}$/)) {
      setPrintStatus("error");
      setPrintStatusMessage("O número da ordem precisa ter 10 dígitos.");
      return;
    }

    if (printMode === "full") {
      try {
        const config = {
          ip: printerIP,
          port: printerPort,
          municipality: selectedMunicipality,
          expDate: selectedDate.replace(/-/g, "/"),
          order: trimmedOrder,
          totalLabels: palletQuantity,
          repack: printRepackLabel ? "Sim" : "Não",
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (window as any).ipcRenderer.invoke(
          "print-exp-full-range",
          config,
        );
        if (result.success) {
          setPrintStatus("success");
          setPrintStatusMessage("Impressão concluída com sucesso!");
        } else {
          setPrintStatus("error");
          setPrintStatusMessage(`Erro! ${result.error}`);
        }
      } catch (error) {
        setPrintStatus("error");
        setPrintStatusMessage(`Erro de comunicação: ${error}`);
      }
      return;
    }

    try {
      const config = {
        ip: printerIP,
        port: printerPort,
        municipality: selectedMunicipality,
        expDate: selectedDate.replace(/-/g, "/"),
        order: trimmedOrder,
        totalLabels: palletQuantity,
        labelToPrint: specificLabelToPrint,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "print-exp-specific-label",
        config,
      );
      if (result.success) {
        setPrintStatus("success");
        setPrintStatusMessage("Impressão concluída com sucesso!");
      } else {
        setPrintStatus("error");
        setPrintStatusMessage("Erro! " + result.error);
      }
    } catch (error) {
      setPrintStatus("error");
      setPrintStatusMessage(`Erro de impressão: ${error}`);
      console.error("Erro na comunicação de impressão:", error);
    }
  }; */

  useEffect(() => {
    const loadBoxTypesDb = async () => {
      try {
        const db = await (window as any).ipcRenderer.invoke(
          "request-box-types-db",
        );
        setBoxTypes(db.data);
      } catch (error) {
        console.error("Erro ao carregar banco de dados", error);
      }
    };

    void loadBoxTypesDb();
  }, []);

  const handleReadPickDetailFile = (file: any) => {
    if (!file) {
      setPickDetailFile([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const data = loadEvent.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      setPickDetailFile(parsedData);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <h2 className="view-title">Planilha de Picking por Case ID</h2>
      <small className="view-subtitle">Número da Ordem</small>
      <input
        type="number"
        placeholder="6878496221"
        value={orderNumber}
        min={6878000000}
        max={9999999999}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
          setOrderNumber(digits);
        }}
      />
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
        onClick={() => console.log(pickDetailFile)}
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
