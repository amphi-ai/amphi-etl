<div align="center">

<img height="60" src="https://amphi.ai/icons/amphi_logo_paths.svg">

<p align="center">
    Visual Data Preparation Powered by Python
    <br/><br/>
    Simple, intutive and easy to use with AI.
</p>
<br/>


<p align="center">
<a href="https://github.com/amphi-ai/amphi-etl/stargazers" target="_blank">
    <img src="https://img.shields.io/github/stars/amphi-ai/amphi-etl?style=social&label=Star&maxAge=2592000" alt="Test">
</a>
<a href="https://join.slack.com/t/amphi-ai/shared_invite/zt-2ci2ptvoy-FENw8AW4ISDXUmz8wcd3bw" target="_blank">
    <img src="https://img.shields.io/badge/slack-join-white.svg?logo=slack" alt="Slack">
</a>
<a href="https://github.com/amphi-ai/amphi-etl/blob/main/LICENSE" target="_blank">
    <img src="https://img.shields.io/static/v1?label=license&message=ELv2&color=white" alt="License">
</a>
<a href="https://badge.fury.io/py/amphi-etl"><img src="https://badge.fury.io/py/amphi-etl.svg" alt="PyPI version"></a>
<a href="https://pepy.tech/projects/amphi-etl"><img src="https://static.pepy.tech/badge/amphi-etl" alt="PyPI Downloads"></a>
<img alt="PyPI - Downloads" src="https://img.shields.io/pypi/dm/amphi-etl">

</p>

![amphi-github-banner](https://github.com/user-attachments/assets/01832e09-3e8a-4d7b-987b-311f3af72071)

English · [Try the demo](https://demo.amphi.ai) · [Report Bug](https://github.com/amphi-ai/amphi-etl/issues) · [Request Feature](https://github.com/amphi-ai/amphi-etl/issues)

</div>

<details>
<summary><kbd>Table of contents</kbd></summary>

#### TOC

- [📦 Installation](#-installation)
- [🔨 Usage](#-usage)
- [✨ Features](#-features)
- [🤝 Contributing](#-contributing)
- [🛣️ Ecosystem](#️-ecosystem)

####

</details>

## 📦 Installation & Update

Amphi is available as both a standalone application or as a JupyterLab extension.

| Amphi ETL (standalone) | Amphi for JupyterLab (extension) |
|------------------------|----------------------|
| ![amphi-etl-home-page](https://github.com/user-attachments/assets/3a37e271-7c8d-495a-9caf-2087804305ef) | ![amphi-for-jupyterlab-homepage2](https://github.com/user-attachments/assets/52abe431-e4c3-4cfc-8ed1-71ab24eaabdf) |
| ```pip install amphi-etl``` | ```pip install jupyterlab-amphi``` |
| ```pip install --upgrade amphi-etl``` | ```pip install --upgrade jupyterlab-amphi``` |

<br/>

> \[!NOTE]
>
> If you prefer to install Amphi's **Jupyterlab extension** through the extension manager, make sure to install `jupyerlab-amphi` package

<br/>

## 🔨 Usage

To start Amphi ETL (standalone), simply run:

```bash
amphi start
```

Use the following parameters to specify your:
- workspace (where you can access files and create pipelines on your system), 
- IP address to expose
- port to use

### Deploy on your local machine

```bash
amphi start -w /your/workspace/path
```

### Deploy on a server

For deploying on a server, you need to specify `-i 0.0.0.0` to expose Amphi and access it through the internet. Optionaly specify a different port.

```bash
amphi start -w /your/workspace/path -i 0.0.0.0 -p 8888 
```

 - 📚 [Documentation](https://docs.amphi.ai)
 - 🚀 [Getting Started](https://docs.amphi.ai/getting-started/installation) 

<br/>

To update Amphi ETL run the following:

```bash
pip install --upgrade amphi-etl
```

## ✨ Features

> \[!NOTE]
>
> Amphi focuses on data transformation for data preparation, reporting and lightweight ETL. It's designed to be super simple to use, quick to ramp up and easy to use with AI (ChatGTP, Claude, Mistra, etc).

**Data Preparation:**

- **Visual Interface / Low-code**: Accelerate data pipeline development and reduce maintenance time.
- **Python-code Generation**: Generate native Python code leveraging common libraries such as [pandas](https://github.com/pandas-dev/pandas), [DuckDB](https://github.com/duckdb/duckdb) that you can run anywhere.
- **Private and Secure**: Self-host Amphi on your laptop or in the cloud for complete privacy and security over your data.

## 🧩 Extensibility:

Amphi is extremely flexible and extensible.
- **Custom code**: Directly use Python or SQL in your pipelines.
- **Custom components**: Add custom components directly from the interface.

How to add a component:
```javascript
// Component file: HelloDate.tsx

class HelloDate extends (globalThis as any).Amphi.BaseCoreComponent {
  constructor() {
    const description = 'Takes a date and outputs a pandas DataFrame with a message including that date.';
    const defaultConfig = { selectedDate: "" }; 
    
    const form = {
      idPrefix: 'component__form',
      fields: [
        { 
            type: 'date', 
            id: 'selectedDate', 
            label: 'Select a Date', 
            placeholder: 'Choose a date' 
        }
      ]
    };
    
    const icon = {
      name: 'amphi-date-input-hello',
      svgstr:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 16H5V9h14v11Z"/><path d="M12 11h2v2h-2zM8 11h2v2H8zM16 11h2v2H8zM8 15h2v2H8zM12 15h2v2h-2zM16 15h2v2h-2z"/></svg>'
    };

    // Parameters: Display Name, Technical ID, Description, Output Type, Inputs, Category, Icon, DefaultConfig, Form
    super('Hello Date', 'helloDate', description, 'pandas_df_input', [], 'inputs', icon, defaultConfig, form);
  }

  provideImports() {
    return ['import pandas as pd'];
  }

  generateComponentCode({ config, outputName }) {
    const date = String(config?.selectedDate ?? '').trim() || 'No Date Selected';
    
    // We create a DataFrame and assign it to the outputName variable
    return `
data = {
    'event': ['Date Selection'],
    'selected_date': ['${date}'],
    'message': ['The user selected the date: ${date}']
}
${outputName} = pd.DataFrame(data)
`;
  }
}

export default new HelloDate();
```

Create a new file in your workspace, such as `HelloDate.tsx` and then right-click and select "Add Component". You should see a notification "ent "Hello Date" (helloDate) updated successfully."
Then either open a new pipeline or refresh the component palette to see the new component appear in the Inputs.

<br/>

<!--
## 👀 Showcase

TBA

<br/>
-->

## 🤝 Contributing

- **Use and Innovate**: Try Amphi and share your use case with us. Your real-world usage and feedback help us improve our product.
- **Voice Your Insights**: Encounter a bug? Have a question? Share them by submitting [issues](https://github.com/amphi-ai/amphi-etl/issues) and help us enhance the user experience.
- **Shape the Future**: Have code enhancements or feature ideas? We invite you to propose [pull requests](https://github.com/amphi-ai/amphi-etl/pulls) and contribute directly.

Every contribution is helpful.

<br/>

## 📡 Telemetry

Amphi collects **anonymous telemetry data** to help us understand users and their use-cases better to improve the product. You can of course **opt out** in the settings and disable any telemetry data collection.

<br/>

---

#### 📝 License

Copyright © 2024-2026 - present [Amphi Labs](https://amphi.ai). <br/> This project is [ELv2](./LICENSE) licensed.
