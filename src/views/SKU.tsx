import { useState } from "react";

interface printerInfo {
  printerPort: number;
  printerIP: string;
}

export default function SKU({ printerPort, printerIP }: printerInfo) {
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [totalLabels, setTotalLabels] = useState(1);

  const [printStatus, setPrintStatus] = useState<
    "none" | "success" | "error" | "awaiting"
  >("none");
  const [printStatusMessage, setPrintStatusMessage] = useState("");

  const handlePrint = async () => {
    setPrintStatus("awaiting");

    try {
      const config = {
        ip: printerIP,
        port: printerPort,
        sku,
        description,
        totalLabels,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "print-sku-label",
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
  };

  return (
    <div>
      <h2 className="view-title">Etiquetas de SKU</h2>
      <small className="view-subtitle">SKU / Código do Item</small>
      <input
        type="text"
        placeholder="10215610"
        value={sku}
        maxLength={40}
        onChange={(e) => setSku(e.target.value.slice(0, 40))}
      />
      <small className="view-subtitle">Descrição</small>
      <input
        type="text"
        placeholder="DUNHILL OF LONDON CARLTON BLEND 2.0 BOX "
        maxLength={40}
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, 40))}
      />
      <small className="view-subtitle">Quantidade de Etiquetas</small>
      <input
        type="number"
        value={totalLabels}
        max={999}
        onChange={(event) => setTotalLabels(parseInt(event.target.value) || 1)}
      />

      <button
        className={
          printStatus === "awaiting"
            ? "print-labels-btn disabled"
            : "print-labels-btn"
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
