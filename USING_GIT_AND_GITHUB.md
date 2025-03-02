# Using Git & Github

This document explains how to use Git and Github when contributing to Amphi Etl

## 👉 Prerequisites 👈
1. You must install the CLI (Command Line Interface) of Git on your machine.
https://git-scm.com/download/linux
https://git-scm.com/download/win
https://git-scm.com/download/mac

you can test it has been installed with the following command that should return the Git CLI version
```bash
git -v
```

2. You must have a GitHub account.


## 👷 The full dev workflow 👷

1. Using your web browser, go to Amphi ETL GitHub page
https://github.com/amphi-ai/amphi-etl

2. On the top right, click on "fork/+create a new fork". It's a necessary step since you don't have the permissions to write directly in the Amphi ETL GitHub repo.

3. On your own account, you must see an amphi repository.
e.g. : https://github.com/{your_github_username}/amphi-etl

4. Now, let's copy the repository on your machine
Go to the repository where you want to store the repository and using your cmd :
```bash
cd C:\Users\{yourusername}\amphi_dev
```

The action of copying the repository is called "cloning". On your Amphi ETL GitHub Repository, on top right, click "Code", "local" and copy the adress (https://github.com/{your_github_username}/amphi-etl.git ). The clone command is 
```bash
git clone https://github.com/{your_github_username}/amphi-etl.git
```

Check that the repository is created on your machine.

Go to the amphi-etl repo on your machine :
```bash
cd amphi-etl
```

Check the git status
```bash
git status
```

5. Do your modifications and build the projet following BUILDING.md

6. Once the project is built and you're good, you will have to commit (i.e. validate your change in the Git meaning).
go the top of folder (id amphi-etl, not amphi-etl-amphi-etl with the cd command)
For that use the command (m is for the message)
```bash
git commit -m "Comment on your commit"
```

You can also do that for only 1,2,... specified files like
```bash
git commit -m "Pushing Only Single file to git" config/local.js
```

In case you're adding a file or modifying a file that wasn't tracked by git, you have to add it with the following cmd 
```bash
git add {file_path}
```

e.g. :
```bash
git add jupyterlab-amphi/packages/pipeline-components-core/src/icons.ts
```

and then commit
```bash
git commit -m "Comment on your commit after adding file"
```

At this step, you have validated your modifications on your repository.

7. Now, let's update your GitHub repository
```bash
git push
```

8. Using your web browser, go to https://github.com/{your_github_username}/amphi-etl
You must see the changes

9. On the top right, click on Contribute, Open Pull request.
On the interface, explain the change.

10. If your change is approved, you will receive a notification. 
