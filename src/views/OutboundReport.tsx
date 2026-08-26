import { useState } from "react";

interface PrinterInfo {
  printerPort: number;
  printerIP: string;
}

interface LabelItem {
  item: string;
  quantity?: number;
  [key: string]: unknown;
}

interface ReportLabelSet {
  lpn: string;
  items: LabelItem[];
}

type DisplayStatus = "none" | "success" | "error" | "awaiting";

export default function OutboundReport({
  printerPort,
  printerIP,
}: PrinterInfo) {
  const [pickDetailFilePath, setPickDetailFilePath] = useState("");
  const [allLabelContents, setAllLabelContents] = useState<ReportLabelSet[]>(
    [],
  );
  const [currentLabelInView, setCurrentLabelInView] = useState<number>(0);

  const [displayStatus, setDisplayStatus] = useState<DisplayStatus>("none");
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

      setPickDetailFilePath(filePath);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "generate-report",
        filePath,
      );

      if (result.success) {
        const labels = result.labels;

        setCurrentLabelInView(0);
        setAllLabelContents(labels);

        setDisplayStatus("success");
        setDisplayStatusMessage(
          "Planilha do Pick Detail processada, verifique o conteúdo das etiquetas.",
        );
      } else {
        setDisplayStatus("error");
        throw new Error(`Erro ao gerar report: ${result.error}`);
      }
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

      {allLabelContents.length > 0 && allLabelContents[currentLabelInView] && (
        <>
          <small className="view-subtitle">
            Etiquetas aguardando impressão
          </small>
          <div className="flex-btns">
            <button
              type="button"
              onClick={() => setCurrentLabelInView(currentLabelInView - 1)}
              className={currentLabelInView === 0 ? "disabled" : "active"}
              disabled={currentLabelInView === 0}
            >
              Etiqueta anterior
            </button>
            <button
              type="button"
              onClick={() => setCurrentLabelInView(currentLabelInView + 1)}
              className={
                currentLabelInView === allLabelContents.length - 1
                  ? "disabled"
                  : "active"
              }
              disabled={currentLabelInView === allLabelContents.length - 1}
            >
              Etiqueta Seguinte
            </button>
          </div>
          <table className="mrg-top-2">
            <thead>
              <tr>
                <th scope="col">SKU</th>
                <th scope="col">QTD</th>
                <th scope="col">SKU</th>
                <th scope="col">QTD</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({
                length: Math.ceil(
                  (allLabelContents[currentLabelInView]?.items?.length || 0) /
                    2,
                ),
              }).map((_, rowIndex) => {
                const itemsList =
                  allLabelContents[currentLabelInView].items || [];
                const firstItem = itemsList[rowIndex * 2];
                const secondItem = itemsList[rowIndex * 2 + 1];

                return (
                  <tr key={rowIndex}>
                    {/* First Item */}
                    <td>{firstItem?.item || ""}</td>
                    <td>{firstItem?.quantity ?? ""}</td>

                    {/* Second Item (if it exists on this LPN) */}
                    <td>{secondItem?.item || ""}</td>
                    <td>{secondItem?.quantity ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {(() => {
                const currentLabel = allLabelContents[currentLabelInView];
                const itemsList = currentLabel?.items || [];

                // 1. Calculate total quantity
                const totalQuantity = itemsList.reduce(
                  (sum, item) => sum + (item.quantity || 0),
                  0,
                );
                const isOverLimit = totalQuantity > 400;

                // 2. Validate LPN format
                let isValidLpn = false;
                if (allLabelContents.length > 0 && currentLabel?.lpn) {
                  // Get the 10-digit base code from the FIRST label in the entire set
                  const firstLpn = allLabelContents[0].lpn;
                  const baseCodeMatch = firstLpn.match(/^EXP(\d{10})\d{3}ARQ$/);

                  if (baseCodeMatch) {
                    const baseCode = baseCodeMatch[1];
                    // Regex for current LPN: "EXP" + [same 10-digit code] + [3-digit counter] + "ARQ"
                    const lpnRegex = new RegExp(`^EXP${baseCode}\\d{3}ARQ$`);
                    isValidLpn = lpnRegex.test(currentLabel.lpn);
                  }
                }

                return (
                  <tr>
                    {/* Dynamic class for LPN format validation */}
                    <th
                      scope="row"
                      colSpan={2}
                      className={isValidLpn ? "green" : "err"}
                    >
                      {currentLabel?.lpn}
                    </th>
                    <th
                      scope="row"
                      colSpan={2}
                      className={isOverLimit ? "err" : "green"}
                    >
                      Quantidade: {totalQuantity}
                    </th>
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </>
      )}

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
