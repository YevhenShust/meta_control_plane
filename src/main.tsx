import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Provider } from 'react-redux';
import { store } from './store';
import { SetupsProvider } from './setup/SetupsContext';
import { Classes } from '@blueprintjs/core';
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "./index.css";

document.body.classList.add(Classes.DARK);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <SetupsProvider>
        <App />
      </SetupsProvider>
    </Provider>
  </React.StrictMode>
);