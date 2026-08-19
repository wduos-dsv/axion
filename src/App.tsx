import { useState } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./views/Home";
import Exp from "./views/Exp";
import Rec from "./views/Rec";
import Location from "./views/Location";
import HuaweiExp from "./views/HuaweiExp";
import SKU from "./views/SKU";
import "./App.css";

import icon from "./assets/logo.svg";

export default function App() {
  const [printerPort, setPrinterPort] = useState<number>(9100);
  const [printerIP, setPrinterIP] = useState<string>("10.55.22.240");
  const [currentView, setCurrentView] = useState<string>("/");

  const ipRegex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const isIpValid = ipRegex.test(printerIP);

  const pages = [
    {
      url: "/",
      svg: (
        <svg viewBox="0 0 24 24">
          <path d="M22,5.724V2c0-.552-.447-1-1-1s-1,.448-1,1v2.366L14.797,.855c-1.699-1.146-3.895-1.146-5.594,0L2.203,5.579c-1.379,.931-2.203,2.48-2.203,4.145v9.276c0,2.757,2.243,5,5,5h2c.553,0,1-.448,1-1V14c0-.551,.448-1,1-1h6c.552,0,1,.449,1,1v9c0,.552,.447,1,1,1h2c2.757,0,5-2.243,5-5V9.724c0-1.581-.744-3.058-2-4Z" />
        </svg>
      ),
      title: "Início",
      element: <Home />,
    },
    {
      url: "/exp",
      svg: (
        <svg viewBox="0 0 24 24">
          <path d="m24 11.5c0-3.032-2.468-5.5-5.5-5.5h-1.5v-.5c0-1.93-1.57-3.5-3.5-3.5h-2.181c.441.927.681 1.944.681 3h1.5c.275 0 .5.225.5.5v12.5h-11v-5.165s-2.973-2.916-3-2.944v11.109h3.05c-.033.162-.05.329-.05.5 0 1.381 1.119 2.5 2.5 2.5s2.5-1.119 2.5-2.5c0-.171-.018-.338-.05-.5h8.101c-.033.162-.05.329-.05.5 0 1.381 1.119 2.5 2.5 2.5s2.5-1.119 2.5-2.5c0-.171-.018-.338-.05-.5h3.05v-9.5zm-5.5-2.5c1.379 0 2.5 1.121 2.5 2.5v2.5h-4v-5zm-13.5 2.994 3.535-3.458c.944-.944 1.465-2.2 1.465-3.536s-.521-2.591-1.465-3.535-2.2-1.465-3.535-1.465-2.593.521-3.535 1.465c-.944.943-1.465 2.199-1.465 3.535s.521 2.592 1.477 3.547zm-1.413-8.409c.377-.377.879-.585 1.413-.585s1.036.208 1.414.586.586.88.586 1.414-.208 1.036-.574 1.402l-1.426 1.395-1.414-1.384c-.378-.377-.586-.879-.586-1.413s.208-1.036.587-1.415z" />
        </svg>
      ),
      title: "Expedição",
      element: <Exp printerPort={printerPort} printerIP={printerIP} />,
    },
    {
      url: "/rec",
      svg: (
        <svg viewBox="0 0 24 24">
          <path d="m10 6v-6h4v6a2 2 0 0 1 -4 0zm6-1h8a5.006 5.006 0 0 0 -5-5h-3zm-8-5h-3a5.006 5.006 0 0 0 -5 5h8zm16 7v12a5.006 5.006 0 0 1 -5 5h-14a5.006 5.006 0 0 1 -5-5v-12h8.142a3.981 3.981 0 0 0 7.716 0zm-4 12a1 1 0 0 0 -1-1h-3a1 1 0 0 0 0 2h3a1 1 0 0 0 1-1z" />
        </svg>
      ),
      title: "Recebimento",
      element: <Rec printerPort={printerPort} printerIP={printerIP} />,
    },
    {
      url: "/loc",
      svg: (
        <svg viewBox="0 0 24 24">
          <path d="m16.949,2.05c-1.321-1.322-3.079-2.05-4.949-2.05s-3.628.728-4.95,2.05c-2.729,2.729-2.729,7.17.008,9.907l2.495,2.44c.675.66,1.561.99,2.447.99s1.772-.33,2.447-.99l2.502-2.448c1.322-1.322,2.051-3.08,2.051-4.95s-.729-3.627-2.051-4.95Zm-4.949,7.94c-1.657,0-3-1.343-3-3s1.343-3,3-3,3,1.343,3,3-1.343,3-3,3Zm12,6.772c.002.354-.183.682-.485.863l-9.861,5.917c-.51.306-1.082.459-1.653.459s-1.144-.153-1.653-.459L.485,17.625c-.303-.182-.487-.51-.485-.863.002-.353.19-.679.495-.857l4.855-2.842c.1.11.203.219.309.325l2.495,2.439c1.028,1.006,2.395,1.561,3.846,1.561s2.817-.555,3.846-1.561l2.518-2.463c.098-.098.194-.199.287-.301l4.854,2.841c.305.179.493.505.495.857Z" />
        </svg>
      ),
      title: "Locação",
      element: <Location printerPort={printerPort} printerIP={printerIP} />,
    },
    {
      url: "/huawei-exp",
      svg: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          id="Layer_1"
          data-name="Layer 1"
          viewBox="0 0 24 24"
        >
          <path d="m23.853,14.501l-.596-2.001c-.439-1.472-1.818-2.5-3.354-2.5H4c-1.537,0-2.916,1.028-3.354,2.5L.05,14.5c-.319,1.069-.119,2.196.548,3.092.667.895,1.69,1.408,2.806,1.408h7.096v2h-3c-.829,0-1.5.672-1.5,1.5s.671,1.5,1.5,1.5h9c.828,0,1.5-.672,1.5-1.5s-.672-1.5-1.5-1.5h-3v-2h6.999c1.116,0,2.14-.514,2.807-1.409.667-.895.866-2.021.547-3.09Zm-14.222,1.499l.25-3h4.239l.25,3h-4.739Zm-6.627-.201c-.056-.075-.141-.232-.078-.441l.596-2.001c.063-.213.256-.356.479-.356h2.87l-.25,3h-3.216c-.218,0-.345-.126-.401-.201Zm17.896,0c-.056.075-.183.201-.4.201h-3.118l-.25-3h2.772c.223,0,.416.144.479.356l.596,2.001c.062.209-.022.366-.078.441ZM5,6.5c0-.828.671-1.5,1.5-1.5h.73c.179-.567.464-1.084.819-1.544l-.773-1.088c-.479-.675-.321-1.611.355-2.091.675-.48,1.612-.321,2.091.354l.784,1.104c.473-.148.972-.236,1.493-.236s1.021.087,1.493.236l.783-1.104c.48-.677,1.417-.833,2.092-.355.676.479.835,1.416.355,2.092l-.773,1.089c.355.46.641.977.819,1.543h.729c.828,0,1.5.672,1.5,1.5s-.672,1.5-1.5,1.5h-2c-.828,0-1.5-.672-1.5-1.5,0-1.103-.897-2-2-2s-2,.897-2,2c0,.828-.671,1.5-1.5,1.5h-2c-.829,0-1.5-.672-1.5-1.5Z" />
        </svg>
      ),
      title: "Expedição Huawei",
      element: <HuaweiExp printerPort={printerPort} printerIP={printerIP} />,
    },
    {
      url: "/sku",
      svg: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          id="Layer_1"
          data-name="Layer 1"
          viewBox="0 0 24 24"
        >
          <path d="m12,6H4C1.794,6,0,7.794,0,10v10c0,2.206,1.794,4,4,4h8c2.206,0,4-1.794,4-4v-10c0-2.206-1.794-4-4-4Zm1,13c0,1.103-.897,2-2,2h-6c-1.103,0-2-.897-2-2v-8c0-1.103.897-2,2-2h6c1.103,0,2,.897,2,2v8Zm-2-8v8s-6,0-6,0v-8h6Zm-2.5-7c-.829,0-1.5-.671-1.5-1.5v-1c0-.829.671-1.5,1.5-1.5s1.5.671,1.5,1.5v1c0,.829-.671,1.5-1.5,1.5Zm14,10c-.829,0-1.5-.671-1.5-1.5V1.5c0-.829.671-1.5,1.5-1.5s1.5.671,1.5,1.5v11c0,.829-.671,1.5-1.5,1.5Zm-3.5,0c-.552,0-1-.448-1-1V1c0-.552.448-1,1-1s1,.448,1,1v12c0,.552-.448,1-1,1Zm-3-9c-.552,0-1-.448-1-1V1c0-.552.448-1,1-1s1,.448,1,1v3c0,.552-.448,1-1,1Zm-4-1c-.552,0-1-.448-1-1V1c0-.552.448-1,1-1s1,.448,1,1v2c0,.552-.448,1-1,1Z" />
        </svg>
      ),
      title: "SKU",
      element: <SKU printerPort={printerPort} printerIP={printerIP} />,
    },
  ];

  return (
    <HashRouter>
      <div className="App">
        <header>
          <img src={icon} alt="Icon" />

          <div className="control-btns">
            <button
              className="minimize-btn"
              onClick={() =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).ipcRenderer.send("window-minimize")
              }
            >
              <svg viewBox="0 0 24 24">
                <path d="M16.5,13.5h-9a1.5,1.5,0,0,1,0-3h9a1.5,1.5,0,0,1,0,3Z" />
              </svg>
            </button>
            <button
              className="maximize-btn"
              onClick={() =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).ipcRenderer.send("window-maximize")
              }
            >
              <svg viewBox="0 0 24 24">
                <path d="M14,19h-4c-2.76,0-5-2.24-5-5v-4c0-2.76,2.24-5,5-5h4c2.76,0,5,2.24,5,5v4c0,2.76-2.24,5-5,5Zm-4-11c-1.1,0-2,.9-2,2v4c0,1.1,.9,2,2,2h4c1.1,0,2-.9,2-2v-4c0-1.1-.9-2-2-2h-4Z" />
              </svg>
            </button>
            <button
              className="close-btn"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => (window as any).ipcRenderer.send("window-close")}
            >
              <svg viewBox="0 0 24 24">
                <path d="M14.121,12,18,8.117A1.5,1.5,0,0,0,15.883,6L12,9.879,8.11,5.988A1.5,1.5,0,1,0,5.988,8.11L9.879,12,6,15.882A1.5,1.5,0,1,0,8.118,18L12,14.121,15.878,18A1.5,1.5,0,0,0,18,15.878Z" />
              </svg>
            </button>
          </div>
        </header>

        <nav>
          {pages.map((page) => (
            <Link
              key={page.url}
              to={page.url}
              onClick={() => setCurrentView(page.url)}
              className={currentView === page.url ? "active" : ""}
            >
              {page.svg}
              {page.title}
            </Link>
          ))}

          <div id="printer-configs">
            <small className="view-subtitle">Configuração da Impressora</small>
            <small className="view-subtitle dim">PORTA</small>
            <input
              type="number"
              placeholder="9100"
              onChange={(event) => setPrinterPort(parseInt(event.target.value))}
              value={printerPort}
              style={{
                border: !printerPort
                  ? "solid 2px var(--red-opaque)"
                  : undefined,
              }}
            />
            <small className="view-subtitle dim">IP</small>
            <input
              type="text"
              placeholder="10.55.22.240"
              onChange={(event) => setPrinterIP(event.target.value)}
              value={printerIP}
              style={{
                border:
                  !isIpValid || printerIP === ""
                    ? "solid 2px var(--red-opaque)"
                    : undefined,
              }}
            />
          </div>
        </nav>

        <main>
          <Routes>
            {pages.map((page) => (
              <Route key={page.url} path={page.url} element={page.element} />
            ))}
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
