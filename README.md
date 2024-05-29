<div align="center">

<img height="60" src="https://amphi.ai/icons/amphi_logo_paths.svg">
<hr>
No-code ETL for structured and unstructured data.

English · [Changelog](./CHANGELOG.md) . [Report Bug][github-issues-link] · [Request Feature][github-issues-link]
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
$ pip install amphi-etl
```

> \[!NOTE]
>
> If you prefer to install Amphi's jupyterlab extension, use `pip install jupyterlab-amphi` in your environment. More information [here](./jupyterlab-amphi/).


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

**Open-source ETL for the AI age:**

- 🖱️ **No-code/Low-code**: Accelerate data and AI pipeline development and reduce maintenance time.
- 🐍 **Python-code Generation**: Generate native Python code leveraging common libraries such as pandas and langchain that you can run anywhere.
- 🔒 **Private and secure**: Self-host Amphi on your laptop or in the cloud for complete privacy and security over your data.

<br/>

**Design Evolution / In Progress**

- [ ] **Implement connections** - Add the ability to securely create connections to reuse in components
- [ ] **Developer documentation** - Write comprehensive documentation to allow extensions

<br/>

## 👀 Showcase

Let's showcase some of ProChat's signature features:

| **Streamlined Dialogue** | **Content Editor** |
| :-: | :-: |
| Engage in Streamlined Conversations that flow as naturally as a river | Refine, reshape, and perfect your dialogue with tools that allow for real-time edits. |
| ![][prevew-1] | ![][prevew-3] |
| **Integrated Render** |  |
| Dive into the vivid world of chat with our Built-in Render, a tool designed to bring text to life. |  |
| ![][prevew-2] |  |

<br/>


## 🤝 Contributing

> \[!IMPORTANT]
>
> Join our collaborative ecosystem. Feel free to :

- **Use and Innovate**: Try Amphi and share your use case with us. Your real-world usage and feedback are invaluable.
- **Voice Your Insights**: Encounter a glitch? Have a query? Your perspectives matter. Share them by submitting [issues][github-issues-link] and help us enhance the user experience.
- **Shape the Future**: Have code enhancements or feature ideas? We invite you to propose [pull requests][pr-welcome-link] and contribute directly to the evolution of our codebase.

Every contribution, big or small, is celebrated. Join us in our mission to refine and elevate the world of ETL for data and AI. 😃

[![][pr-welcome-shield]][pr-welcome-link]

<br/>

## 🛣️ Ecosystem

Amphi is available as an extension for Jupyterlab and Amphi ETL is a distribution based on Jupyterlab. Therefore Jupyterlab extensions can be installed on Amphi ETL.

- **[Jupyterlab](https://github.com/jupyterlab/jupyterlab)** - JupyterLab computational environment.
- **[ProEditor](https://github.com/jupyterlab/jupyterlab-git)** - A Git extension for JupyterLab.

<br/>

---

#### 📝 License

Copyright © 2024 - present [Amphi Labs](https://amphi.ai). <br/> This project is [ELv2](./LICENSE) licensed.