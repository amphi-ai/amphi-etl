# Use the regular Python base image
FROM python:3.11-slim

# Switch to root user to install dependencies
USER root

# Create a work directory and set permissions
RUN mkdir -p /home/amphi \
    && chown -R 1000:100 /home/amphi

# Add amphi user
RUN useradd -m -s /bin/bash -N -u 1000 amphi

# Install Node.js and npm
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# Set environment variables for Snowflake
ENV JUPYTER_ENABLE_LAB=yes \
    NB_UID=1000 \
    NB_GID=100

# Add .local/bin to PATH to avoid warnings
ENV PATH="/home/amphi/.local/bin:$PATH"

# Set the working directory
WORKDIR /home/amphi

# Ensure the user has full access to this directory
RUN chown -R 1000:100 /home/amphi

RUN python3 -m pip install numpy pandas==2.2.1 python-dotenv

# Install required Python packages from requirements.txt
RUN python3 -m pip install jupyterlab==4.2.5
RUN python3 -m pip install jupyterlab-amphi==0.8.1

# Provide theme and ui-component
COPY amphi/theme-light /usr/local/share/jupyter/labextensions/@amphi/theme-light
COPY amphi/ui-component /usr/local/share/jupyter/labextensions/@amphi/ui-component

# Custom Jupyterlab config files
COPY config/labconfig/page_config.json /etc/jupyter/labconfig/page_config.json
COPY config/settings/overrides.json /usr/local/share/jupyter/lab/settings/overrides.json

# Switch to amphi user
USER amphi

# Set the default command to start JupyterLab in a specific folder
ENTRYPOINT ["jupyter", "lab", "--allow-root", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--NotebookApp.token=''", "--NotebookApp.password=''", "--notebook-dir=/home/amphi/data", "--ContentManager.allow_hidden=True"]
