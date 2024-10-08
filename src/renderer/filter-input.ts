import { LitElement, html } from "lit";
import { state } from "lit/decorators.js";
import { css } from "lit";
import { baseInputStyles } from "./shared-styles"; // Adjust the path as necessary
import { eventBus } from "./event-bus";

// Define the type for each proxy server configuration
interface ProxyServerConfig {
  port: number;
  description: string;
}

// Define the configuration interface
interface AppConfig {
  proxyServers: ProxyServerConfig[];
}

// Step 1: Define an interface for the event detail
interface FilterChangeDetail {
  filterTag: string;
  regexEnabled: boolean;
  scanRequest: boolean;
  scanResponse: boolean;
  scanJwtFormatted: boolean; // New flag added here
  proxyServersEnabled: Record<number, boolean>; // Add proxy servers' state to the event detail
}

// Step 2: Create a custom event type using the detail interface
export type FilterChangeEvent = CustomEvent<FilterChangeDetail>;

class FilterInput extends LitElement {
  static styles = [
    baseInputStyles,
    css`
      #filter-tag-input {
        width: 12rem;
      }
      label {
        color: gray;
        width: 3rem;
      }
    `,
  ];

  @state() filterTag = "";
  @state() regexEnabled = false;
  @state() scanRequest = true;
  @state() scanResponse = true;
  @state() scanJwtFormatted = false; // Initialize the new state
  @state() proxyServersEnabled: Record<number, boolean> = {}; // Initialize as an empty object

  constructor() {
    super();
    console.log('const called')
    // Access the config from the main process at the beginning
    const config: AppConfig = window.electron.getConfig() as AppConfig;

    // Safely initialize states from localStorage
    const storedFilterTag = localStorage.getItem("filter-tag");
    this.filterTag = storedFilterTag ?? "";

    const storedRegexEnabled = localStorage.getItem("regex-enabled");
    this.regexEnabled = storedRegexEnabled ? JSON.parse(storedRegexEnabled) === true : false;

    const storedScanRequest = localStorage.getItem("scan-request");
    this.scanRequest = storedScanRequest ? JSON.parse(storedScanRequest) === true : true;

    const storedScanResponse = localStorage.getItem("scan-response");
    this.scanResponse = storedScanResponse ? JSON.parse(storedScanResponse) === true : true;

    // Initialize the new state from localStorage
    const storedScanJwtFormatted = localStorage.getItem("scan-jwt-formatted");
    this.scanJwtFormatted = storedScanJwtFormatted ? JSON.parse(storedScanJwtFormatted) === true : false;

    // Initialize proxy server states (enabled/disabled) based on the config and localStorage
    if (config) {
      config.proxyServers.forEach((server: ProxyServerConfig) => {
        const storedState = localStorage.getItem(`proxy-enabled-${server.port}`);
        this.proxyServersEnabled = {
          ...this.proxyServersEnabled,
          [server.port]: storedState ? JSON.parse(storedState) === true : true,
        };
      });
    }

    // Dispatch initial event
    const filterChangeEvent: FilterChangeEvent =
    new CustomEvent<FilterChangeDetail>("filter-change", {
      detail: {
        filterTag: this.filterTag,
        regexEnabled: this.regexEnabled,
        scanRequest: this.scanRequest,
        scanResponse: this.scanResponse,
        scanJwtFormatted: this.scanJwtFormatted, // Include the new flag
        proxyServersEnabled: this.proxyServersEnabled, // Include proxy server states
      },
    });
    
    setTimeout(() => {
      eventBus.dispatchEvent(filterChangeEvent);
    }, 0);
  }

  private _handleInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;

    if (input.type === "checkbox") {
      switch (input.id) {
        case "regex-checkbox":
          this.regexEnabled = input.checked;
          localStorage.setItem(
            "regex-enabled",
            JSON.stringify(this.regexEnabled),
          );
          break;
        case "request-checkbox":
          this.scanRequest = input.checked;
          localStorage.setItem(
            "scan-request",
            JSON.stringify(this.scanRequest),
          );
          break;
        case "response-checkbox":
          this.scanResponse = input.checked;
          localStorage.setItem(
            "scan-response",
            JSON.stringify(this.scanResponse),
          );
          break;
        case "jwt-checkbox": // Handle the new checkbox
          this.scanJwtFormatted = input.checked;
          localStorage.setItem(
            "scan-jwt-formatted",
            JSON.stringify(this.scanJwtFormatted),
          );
          break;
        default:
          if (input.id.startsWith("proxy-port-")) {
            const port = Number(input.value);
            this.proxyServersEnabled = {
              ...this.proxyServersEnabled,
              [port]: input.checked,
            };
            localStorage.setItem(
              `proxy-enabled-${port}`,
              JSON.stringify(input.checked),
            ); // Store the state for the proxy server
          }
      }
    } else {
      this.filterTag = input.value.toLowerCase();
      localStorage.setItem("filter-tag", this.filterTag);
    }

    // Step 3: Dispatching an event with the current filter tag, regex, request, response, jwtFormatted, and proxy server states
    const filterChangeEvent: FilterChangeEvent =
      new CustomEvent<FilterChangeDetail>("filter-change", {
        detail: {
          filterTag: this.filterTag,
          regexEnabled: this.regexEnabled,
          scanRequest: this.scanRequest,
          scanResponse: this.scanResponse,
          scanJwtFormatted: this.scanJwtFormatted, // Include the new flag
          proxyServersEnabled: this.proxyServersEnabled, // Include proxy server states
        },
      });

    eventBus.dispatchEvent(filterChangeEvent);
  };

  render() {
    const config: AppConfig = window.electron.getConfig() as AppConfig;
    return html`
      <div id="filter-tag-container">
        <input
          id="filter-tag-input"
          type="text"
          placeholder="Enter your filter tag"
          .value=${this.filterTag}
          @input=${this._handleInput}
        />

        <input
          id="regex-checkbox"
          type="checkbox"
          .checked=${this.regexEnabled}
          @change=${this._handleInput}
        />
        <label for="regex-checkbox">Regex</label>
        
        <!-- Adding JWT Formatted Checkbox -->
        <input
          id="jwt-checkbox"
          type="checkbox"
          .checked=${this.scanJwtFormatted}
          @change=${this._handleInput}
        />
        <label for="jwt-checkbox">JWT</label>
        
        <!-- Adding Request Checkbox -->
        <input
          id="request-checkbox"
          type="checkbox"
          .checked=${this.scanRequest}
          @change=${this._handleInput}
        />
        <label for="request-checkbox">Request</label>
        
        <!-- Adding Response Checkbox -->
        <input
          id="response-checkbox"
          type="checkbox"
          .checked=${this.scanResponse}
          @change=${this._handleInput}
        />
        <label for="response-checkbox">Response</label>

        <!-- Dynamically adding checkboxes for proxy servers -->
        ${config.proxyServers.map(
          (server: ProxyServerConfig) => html`
            <input
              id="proxy-port-${server.port}"
              type="checkbox"
              .value=${String(server.port)}
              .checked=${this.proxyServersEnabled[server.port]}
              @change=${this._handleInput}
            />
            <label for="proxy-port-${server.port}">${server.port}</label>
          `,
        )}
      </div>
    `;
  }
}

customElements.define("filter-input", FilterInput);
