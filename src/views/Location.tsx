import { useState } from "react";

interface PrinterInfo {
  printerPort: number;
  printerIP: string;
}

export default function Location({ printerPort, printerIP }: PrinterInfo) {
  const [positionCode, setPositionCode] = useState("");
  const [includeQR, setIncludeQR] = useState(true);
  const [fontSize, setFontSize] = useState(135);

  const [printStatus, setPrintStatus] = useState<
    "none" | "success" | "error" | "awaiting"
  >("none");
  const [printStatusMessage, setPrintStatusMessage] = useState("");

  const handlePrint = async () => {
    setPrintStatus("awaiting");

    console.log(fontSize);
    try {
      const config = {
        ip: printerIP,
        port: printerPort,
        position: positionCode.trim(),
        hasQR: includeQR,
        fontSize: fontSize,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "print-position-label",
        config,
      );

      if (result.success) {
        setPrintStatus("success");
        setPrintStatusMessage(
          `Impressão de etiqueta(s) enviada(s) com sucesso!`,
        );
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
      <h2 className="view-title">Etiqueta de Locação</h2>
      <small className="view-subtitle">Código da posição</small>
      <input
        type="text"
        maxLength={11}
        onChange={(e) => {
          setPositionCode(e.target.value.toUpperCase());
        }}
      />

      <small className="view-subtitle">Incluir QR Code</small>
      <input
        type="checkbox"
        checked={includeQR}
        onChange={() => setIncludeQR(!includeQR)}
      />

      <small className="view-subtitle">Tamanho da fonte</small>
      <select
        value={String(fontSize)}
        onChange={(e) => setFontSize(parseInt(e.target.value))}
      >
        <option value="135">135</option>
        <option value="125">125</option>
        <option value="115">115</option>
        <option value="105">105</option>
        <option value="95">95</option>
      </select>

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
