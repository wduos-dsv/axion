import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import bwipjs from "bwip-js";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = await (window as any).ipcRenderer.invoke(
          "request-box-types-db",
        );

        setBoxTypes(db.data);
      } catch (error) {
        setDisplayStatus("error");
        setDisplayStatusMessage(`Erro ao carregar banco de dados:${error}`);
      }
    };

    void loadBoxTypesDb();
  }, []);

  const getBoxTypeFromDb = (sku: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const foundBox: any = boxTypes.find((box: any) => box.SKU === sku);
    return foundBox ? foundBox.Type : "";
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processPickDetail = async (parsedData: string | any[]) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet();
    const thinBorder = {
      top: { style: "thin", color: { argb: "000000" } },
      left: { style: "thin", color: { argb: "000000" } },
      bottom: { style: "thin", color: { argb: "000000" } },
      right: { style: "thin", color: { argb: "000000" } },
    } as const;

    worksheet.columns = [
      { key: "bType", width: 15 },
      { key: "sku", width: 15 },
      { key: "pos", width: 15 },
      { key: "qty", width: 10 },
      { key: "barcode", width: 30 },
    ];

    worksheet.columns.forEach((column) => {
      column.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    });

    worksheet.getCell("A1").value = `LS${priority}`;
    worksheet.getCell("A1").font = { bold: true };
    worksheet.getCell("A1").border = thinBorder;
    worksheet.getCell("B1").value = "Ordem";
    worksheet.getCell("B1").font = { bold: true };
    worksheet.getCell("B1").border = thinBorder;
    worksheet.getCell("C1").value = orderNumber;
    worksheet.getCell("C1").border = thinBorder;
    worksheet.getCell("D1").value = "Destino";
    worksheet.getCell("D1").font = { bold: true };
    worksheet.getCell("D1").border = thinBorder;
    worksheet.getCell("E1").value = selectedMunicipality;
    worksheet.getCell("E1").border = thinBorder;

    const tableHeaderRow = worksheet.getRow(3);

    tableHeaderRow.values = [
      "Tipo de Caixa",
      "SKU",
      "Posição",
      "Qtd - MIL",
      "Case ID",
    ];

    tableHeaderRow.font = { bold: true };
    tableHeaderRow.eachCell((cell) => {
      cell.border = thinBorder;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    const sortedData = [...parsedData].sort((a, b) => {
      // 1. Primary Sort: Box Type
      const typeA = getBoxTypeFromDb(a?.Item);
      const typeB = getBoxTypeFromDb(b?.Item);
      const typeComparison = typeA.localeCompare(typeB);

      if (typeComparison !== 0) {
        return typeComparison;
      }

      // 2. Secondary Sort: SKU
      const skuA = String(a?.Item || "");
      const skuB = String(b?.Item || "");
      const skuComparison = skuA.localeCompare(skuB, undefined, {
        numeric: true,
      });

      if (skuComparison !== 0) {
        return skuComparison;
      }

      // 3. Tertiary Sort: Location
      const locA = String(a?.Location || "");
      const locB = String(b?.Location || "");

      return locA.localeCompare(locB, undefined, { numeric: true });
    });

    for (let i = 0; i < sortedData.length; i++) {
      const item = sortedData[i];
      const rowIndex = i + 4;
      const row = worksheet.addRow({
        bType: getBoxTypeFromDb(item?.Item),
        sku: item?.Item || "",
        pos: item?.Location || "",
        qty: parseInt(item?.Quantity) || "",
        barcode: item?.["Case ID"] || "",
      });

      row.height = 50;

      row.eachCell((cell) => {
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        cell.border = thinBorder;
      });

      console.log(item);

      const barcodePngBuffer = await bwipjs.toBuffer({
        bcid: "code128",
        text: item?.["Case ID"] || "",
        scale: 3,
        height: 10,
        includeText: true,
        textalign: "center",
      });

      const imageId = workbook.addImage({
        buffer: barcodePngBuffer,
        extension: "png",
      });

      worksheet.addImage(imageId, {
        tl: { col: 4, row: rowIndex - 1 },
        ext: { width: 160, height: 50 },
      });
    }

    const excelBuffer = await workbook.xlsx.writeBuffer();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (window as any).ipcRenderer.invoke(
      "save-excel-file",
      excelBuffer,
    );

    if (result.success) {
      setDisplayStatus("success");
      setDisplayStatusMessage("Planilha gerada com sucesso!");
    } else {
      setDisplayStatus("error");
      setDisplayStatusMessage(`Erro ao salvar: ${result.error}`);
    }
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
        onClick={() => processPickDetail(pickDetailFile)}
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
