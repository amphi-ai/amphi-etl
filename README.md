<div align="center">

<img height="60" src="https://amphi.ai/icons/amphi_logo_paths.svg">
<p align="center">
    <em>No-code Python-Based ETL for structured and unstructured data.</em>
</p>
<hr>

<br/>

<p align="center">
<a href="https://github.com/airbytehq/airbyte/stargazers/" target="_blank">
    <img src="https://img.shields.io/github/stars/amphi-ai/amphi-etl?style=social&label=Star&maxAge=2592000" alt="Test">
</a>
<a href="https://join.slack.com/t/amphi-ai/shared_invite/zt-2ci2ptvoy-FENw8AW4ISDXUmz8wcd3bw" target="_blank">
    <img src="https://img.shields.io/badge/slack-join-white.svg?logo=slack" alt="Slack">
</a>
<a href="https://github.com/amphi-ai/amphi-etl/blob/main/LICENSE" target="_blank">
    <img src="https://img.shields.io/static/v1?label=license&message=ELv2&color=white" alt="License">
</a>
</p>

![Screenshot 2024-05-29 at 3 47 44 PM](https://github.com/amphi-ai/amphi-etl/assets/15718239/3f4793fe-776d-4c08-8fcc-7b8cf27eac1b)


English · [Changelog](./CHANGELOG.md) · [Report Bug](https://github.com/amphi-ai/amphi-etl/issues) · [Request Feature](https://github.com/amphi-ai/amphi-etl/issues)

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

To install `amphi-etl`, run the following command:

```bash
pip install amphi-etl
```

> \[!NOTE]
>
> If you prefer to install Amphi's **Jupyterlab extension**, use `pip install jupyterlab-amphi` in your environment. More information [here](./jupyterlab-amphi/).

<br/>

## 🔨 Usage

To start Amphi, simply run:

```bash
amphi start
```

Use the following parameters to specify your working workspace (where you can access files and create pipelines on your system) and/or port to use:

```bash
amphi start -w /your/workspace/path -p 8888
```

 - 📚 [Documentation](https://docs.amphi.ai)
 - 🚀 [Getting Started](https://docs.amphi.ai/getting-started/installation) 

<br/>

## ✨ Features

> \[!NOTE]
>
> Amphi focuses on structured and unstructured data manipulation for data and AI pipelines. It aims to empower data scientists and data engineers to easily create and experiment pipelines with and intuitive no-code interface.

![amphi-screenshot-github](https://github.com/amphi-ai/amphi-etl/assets/15718239/de1ccaa5-35ea-40e4-a464-2e498946c43a)

**Open-source ETL for the AI age:**

- 🧑‍💻 **No-code/Low-code**: Accelerate data and AI pipeline development and reduce maintenance time.
- 🐍 **Python-code Generation**: Generate native Python code leveraging common libraries such as [pandas](https://github.com/pandas-dev/pandas), [DuckDB](https://github.com/duckdb/duckdb) and [LangChain](https://github.com/langchain-ai/langchain) that you can run anywhere.
- 🔒 **Private and secure**: Self-host Amphi on your laptop or in the cloud for complete privacy and security over your data.


**Structured & Unstructured**

- 🔢 **Structured** - Import data from various sources, including CSV and Parquet files, as well as databases. Transform structured data using aggregation, filters, joins, SQL queries, and more. Export the transformed data into common files or databases.
- 📝 **Unstructured** - Extract data from PDFs, Word documents, and websites (HTML). Perform parsing, chunking and embedding processing. Load the processed data into vector stores such as Pinecone and ChromaDB.
- 🔁 **Convert** - Easily convert structured data into unstructured document for vector stores and vice versa for RAG pipelines.

<br/>

**Design Evolution / In Progress**

- [ ] **Implement connections** - Add the ability to securely create connections to reuse in components
- [ ] **Developer documentation** - Write comprehensive documentation to allow extensions

<br/>

<!--
## 👀 Showcase

Let's showcase some of ProChat's signature features:

TBA

<br/>
-->

## 🤝 Contributing

- **Use and Innovate**: Try Amphi and share your use case with us. Your real-world usage and feedback are invaluable.
- **Voice Your Insights**: Encounter a glitch? Have a query? Your perspectives matter. Share them by submitting [issues][https://github.com/amphi-ai/amphi-etl/issues] and help us enhance the user experience.
- **Shape the Future**: Have code enhancements or feature ideas? We invite you to propose [pull requests][https://github.com/amphi-ai/amphi-etl/pulls] and contribute directly to the evolution of our codebase.

Every contribution, big or small, is celebrated. Join us in our mission to refine and elevate the world of ETL for data and AI. 😃

<br/>

## 🛣️ Ecosystem

Amphi is available as an extension for Jupyterlab and Amphi ETL is a distribution based on Jupyterlab. Therefore Jupyterlab extensions can be installed on Amphi ETL.

- **[Jupyterlab](https://github.com/jupyterlab/jupyterlab)** - JupyterLab computational environment.
- **[jupyterlab-git](https://github.com/jupyterlab/jupyterlab-git)** - A Git extension for JupyterLab.

---

#### 📝 License

Copyright © 2024 - present [Amphi Labs](https://amphi.ai). <br/> This project is [ELv2](./LICENSE) licensed.
