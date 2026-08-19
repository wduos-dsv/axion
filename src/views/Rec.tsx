import { useState } from "react";

interface PrinterInfo {
  printerPort: number;
  printerIP: string;
}

export default function Rec({ printerPort, printerIP }: PrinterInfo) {
  const [printMode, setPrintMode] = useState<"sequential" | "reprint">(
    "sequential",
  );
  const [totalLabels, setTotalLabels] = useState(1);
  const [manualCode, setManualCode] = useState("");

  const [printStatus, setPrintStatus] = useState<
    "none" | "success" | "error" | "awaiting"
  >("none");
  const [printStatusMessage, setPrintStatusMessage] = useState("");
  const [uniqueCodeDisplay, setUniqueCodeDisplay] = useState("");

  const handlePrint = async () => {
    setPrintStatus("awaiting");
    setUniqueCodeDisplay("");

    if (printMode === "reprint") {
      const trimmed = manualCode.trim();
      if (!trimmed || !/^\d+$/.test(trimmed) || trimmed.length !== 8) {
        setPrintStatus("error");
        setPrintStatusMessage(
          "O código inserido deve conter exatamente 8 dígitos numéricos.",
        );
        return;
      }
    }

    try {
      const config = {
        ip: printerIP,
        port: printerPort,
        mode: printMode,
        totalLabels: printMode === "sequential" ? totalLabels : 1,
        manualCode: manualCode.trim(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "print-rec-labels",
        config,
      );

      if (result.success) {
        setPrintStatus("success");
        setPrintStatusMessage(
          `Impressão de etiqueta(s) enviada(s) com sucesso!`,
        );
        if (result.uniqueCode) {
          setUniqueCodeDisplay(
            `Sequência única deste lote: ${result.uniqueCode}`,
          );
        }
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
      <h2 className="view-title">Etiquetas REC</h2>
      <small className="view-subtitle">modo</small>
      <div className="flex-btns">
        <button
          type="button"
          onClick={() => {
            setPrintMode("sequential");
            setUniqueCodeDisplay("");
            setPrintStatusMessage("");
          }}
          className={printMode === "sequential" ? "active" : ""}
        >
          Sequencial
        </button>
        <button
          type="button"
          onClick={() => {
            setPrintMode("reprint");
            setUniqueCodeDisplay("");
            setPrintStatusMessage("");
          }}
          className={printMode === "reprint" ? "active" : ""}
        >
          Reimpressão Manual
        </button>
      </div>

      {printMode === "sequential" ? (
        <>
          <small className="view-subtitle">Número de etiquetas</small>
          <input
            type="number"
            min={1}
            max={999}
            value={totalLabels}
            onChange={(e) => {
              const nextValue = parseInt(e.target.value, 10);
              if (Number.isNaN(nextValue)) {
                setTotalLabels(1);
                return;
              }

              const clampedValue = Math.min(Math.max(nextValue, 1), 999);
              setTotalLabels(clampedValue);
            }}
          />
        </>
      ) : (
        <>
          <small className="view-subtitle">
            Insira o código numérico da LPN:
          </small>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              disabled
              value="REC"
              style={{ width: "60px", textAlign: "center" }}
            />
            <input
              type="text"
              maxLength={8}
              placeholder="12345001"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
            />
            <input
              type="text"
              disabled
              value="ARQ"
              style={{ width: "60px", textAlign: "center" }}
            />
          </div>
        </>
      )}

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
      {uniqueCodeDisplay && (
        <small className="mrg-top-3 text-xs center bold accent">
          {uniqueCodeDisplay}
        </small>
      )}
    </div>
  );
}
