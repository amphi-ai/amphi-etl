<div align="center">

<img height="60" src="https://amphi.ai/icons/amphi_logo_paths.svg">

<p align="center">
    <br/>
    Visual Data Transformation based on Python
    <br/><br/>
   For data preparation, reporting and ETL.
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
</p>

![amphi-github-banner](https://github.com/user-attachments/assets/e13ac7e9-4c6f-47f6-b48e-f62e098cef82)


English · [Try the demo](https://demo.amphi.ai) · [Report Bug](https://github.com/amphi-ai/amphi-etl/issues) · [Request Feature](https://github.com/amphi-ai/amphi-etl/issues)

</div>

<details>
<summary><kbd>Table of contents</kbd></summary>

#### TOC

- [📦 Installation](#-installation)
- [🔨 Usage](#-usage)
- [✨ Features](#-features)
- [👀 Showcase](#-showcase)
- [🤝 Contributing](#-contributing)
- [🛣️ Ecosystem](#️-ecosystem)

####

</details>

## 📦 Installation

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

Use the following parameters to specify your workspace (where you can access files and create pipelines on your system) and port to use:

```bash
amphi start -w /your/workspace/path -p 8888
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
> Amphi focuses on data transformation for data preparation, reporting and ETL. It aims to empower data analysts, scientists and data engineers to easily develop pipelines with an intuitive low-code interface while generating Python code you can deploy anywhere.

**Data Transformation solution for the AI age:**

- 🧑‍💻 **Visual Interface / Low-code**: Accelerate data pipeline development and reduce maintenance time.
- 🐍 **Python-code Generation**: Generate native Python code leveraging common libraries such as [pandas](https://github.com/pandas-dev/pandas), [DuckDB](https://github.com/duckdb/duckdb) that you can run anywhere.
- 🔒 **Private and Secure**: Self-host Amphi on your laptop or in the cloud for complete privacy and security over your data.


![generate-python-code-amphi](https://github.com/user-attachments/assets/67410947-caea-45b4-a8fc-4ceb7bb3dbce)


<br/>

**Features In Progress**

- [ ] **Custom components** - Add the ability to develop your own component and wrap configured ones
- [x] **Implement connections** - ~Add the ability to securely create connections to reuse in components~
- [ ] **Developer documentation** - Write comprehensive documentation to allow extensions
- [x] **Save Components** - ~Save components and reuse them in other pipelines~

<br/>

<!--
## 👀 Showcase

TBA

<br/>
-->

## 🤝 Contributing

- **Use and Innovate**: Try Amphi and share your use case with us. Your real-world usage and feedback help us improve our product.
- **Voice Your Insights**: Encounter a glitch? Have a query? Share them by submitting [issues](https://github.com/amphi-ai/amphi-etl/issues) and help us enhance the user experience.
- **Shape the Future**: Have code enhancements or feature ideas? We invite you to propose [pull requests](https://github.com/amphi-ai/amphi-etl/pulls) and contribute directly.

Every contribution, big or small, is celebrated. Join us in our mission to refine and elevate the world of ETL for data and AI. 😃

<br/>

## 🛣️ Ecosystem

Amphi is available as an extension for Jupyterlab, and Amphi ETL is based on Jupyterlab. Therefore Jupyterlab extensions can be installed on Amphi ETL.

- **[Jupyterlab](https://github.com/jupyterlab/jupyterlab)** - JupyterLab computational environment.
- **[jupyterlab-git](https://github.com/jupyterlab/jupyterlab-git)** - A Git extension for JupyterLab.

---

#### 📝 License

Copyright © 2024 - present [Amphi Labs](https://amphi.ai). <br/> This project is [ELv2](./LICENSE) licensed.
