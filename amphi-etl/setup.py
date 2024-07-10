from setuptools import setup, find_packages
import os

# Collect files recursively from a directory
def collect_files(src_dir, dest_dir):
    files = []
    for root, dirs, filenames in os.walk(src_dir):
        for dirname in dirs:
            dirpath = os.path.join(root, dirname)
            files.append((os.path.join(dest_dir, os.path.relpath(dirpath, src_dir)), []))
        for filename in filenames:
            src_file = os.path.join(root, filename)
            dest_file = os.path.relpath(src_file, src_dir)
            files.append((os.path.join(dest_dir, os.path.dirname(dest_file)), [src_file]))
    return files

# Define the data files structure
data_files = (
    collect_files('amphi', 'share/jupyter/labextensions/@amphi') +
    collect_files('config/labconfig', 'etc/jupyter/labconfig') +
    collect_files('config/settings', 'share/jupyter/lab/settings')
)

setup(
    name='amphi-etl',
    version='0.4.10',
    description='Open-source and Python-based ETL',
    author='Thibaut Gourdel',
    author_email='tgourdel@amphi.ai',
    license='ELv2',
    install_requires=[
        'jupyterlab>=4.1.5',
        'jupyterlab-amphi>=0.3.1',
        'jupyterlab-git'
    ],
    keywords=[],  # Added an empty list for keywords to resolve the dynamic 'keywords' issue.
    packages=find_packages(include=['amphi', 'amphi.theme-light', 'amphi.ui-component', 'config', 'packages']),  # Custom package discovery.
    include_package_data=True,  # Include non-Python files specified in MANIFEST.in
    package_data={
        'amphi': ['theme-light/*', 'ui-component/*'],  # Include built extensions
    },
    data_files=data_files,
    entry_points={
        'console_scripts': [
            'amphi=amphi.main:main',
        ],
    }
)