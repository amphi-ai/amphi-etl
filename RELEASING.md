# Release Process

This document describes the automated release process for Amphi ETL packages.

## Overview

Amphi ETL uses GitHub Actions for automated publishing to PyPI. Releases are triggered by pushing version tags to the repository.

**Packages released together:**
- `jupyterlab-amphi` - JupyterLab extension foundation
- `amphi-scheduler` - Scheduler extension
- `amphi-etl` - Main application

All three packages are versioned together and released simultaneously.

## Prerequisites

### First-Time Setup

Before you can use automated releases, you need to configure PyPI Trusted Publishing:

#### 1. PyPI Trusted Publishing Setup

For each package, configure trusted publishing on PyPI:

**For jupyterlab-amphi:**
1. Go to https://pypi.org/manage/project/jupyterlab-amphi/settings/publishing/
2. Click "Add a new pending publisher"
3. Fill in:
   - **Owner:** Your GitHub username or organization (e.g., `amphi-ai`)
   - **Repository name:** Your repo name (e.g., `amphi-etl`)
   - **Workflow name:** `pypi-publish.yml`
   - **Environment name:** `pypi-jupyterlab-amphi`
4. Click "Add"

**Repeat for amphi-scheduler:**
- URL: https://pypi.org/manage/project/amphi-scheduler/settings/publishing/
- Environment name: `pypi-amphi-scheduler`

**Repeat for amphi-etl:**
- URL: https://pypi.org/manage/project/amphi-etl/settings/publishing/
- Environment name: `pypi-amphi-etl`

#### 2. GitHub Environments Setup

Create three GitHub environments in your repository:

1. Go to repository **Settings** → **Environments**
2. Create environment: `pypi-jupyterlab-amphi`
3. Create environment: `pypi-amphi-scheduler`
4. Create environment: `pypi-amphi-etl`

**Optional:** Add deployment protection rules:
- Require approval from specific reviewers before publishing
- Restrict to specific branches (e.g., only `main`)

## Creating a New Release

### 1. Prepare for Release

Ensure the `main` branch is clean and ready:

```bash
git checkout main
git pull origin main
```

Run tests and verify everything works:

```bash
cd jupyterlab-amphi && jlpm test && cd ..
cd amphi-scheduler && jlpm test && cd ..
cd amphi-etl && jlpm test && cd ..
```

### 2. Create and Push Version Tag

```bash
# Set the new version (update this)
VERSION="0.9.6"

# Create annotated tag
git tag -a "v${VERSION}" -m "Release v${VERSION}"

# Push the tag (this triggers the workflow)
git push origin "v${VERSION}"
```

### 3. Monitor the Workflow

1. Go to: https://github.com/YOUR-ORG/amphi-etl/actions
2. Find the "Publish to PyPI" workflow run
3. Watch the progress:
   - ✅ **validate-and-build** - Builds all packages
   - ✅ **publish-jupyterlab-amphi** - Publishes to PyPI
   - ✅ **publish-amphi-scheduler** - Publishes to PyPI
   - ✅ **publish-amphi-etl** - Publishes to PyPI
   - ✅ **create-github-release** - Creates GitHub release

### 4. Verify Publication

Check that packages are published:

- jupyterlab-amphi: https://pypi.org/project/jupyterlab-amphi/
- amphi-scheduler: https://pypi.org/project/amphi-scheduler/
- amphi-etl: https://pypi.org/project/amphi-etl/

Test installation in a fresh environment:

```bash
python -m venv test-env
source test-env/bin/activate  # On Windows: test-env\Scripts\activate
pip install amphi-etl==0.9.6
amphi --version
```

### 5. Update Changelog (Optional)

After successful release, update the changelog:

1. Edit `CHANGELOG.md` with release notes
2. Commit and push to main:

```bash
git add CHANGELOG.md
git commit -m "Update CHANGELOG for v${VERSION}"
git push origin main
```

## Workflow Details

The GitHub Actions workflow performs these steps:

### Job 1: validate-and-build
- Extract version from git tag (e.g., `v0.9.6` → `0.9.6`)
- Update `package.json` in all three packages
- Update `_version.py` files
- Build JavaScript/TypeScript: `jlpm install && jlpm build:prod`
- Build Python packages: `python -m build` (creates wheel + sdist)
- Upload artifacts for publishing jobs

### Job 2-4: publish-*
- Download build artifacts
- Publish to PyPI using trusted publishing (OIDC)
- Packages published in dependency order:
  1. jupyterlab-amphi (no dependencies)
  2. amphi-scheduler (depends on jupyterlab)
  3. amphi-etl (depends on both)

### Job 5: create-github-release
- Create GitHub release with version tag
- Attach wheel and source distribution files
- Include installation instructions and PyPI links

## Troubleshooting

### Build Fails

If the build fails:

1. Check the workflow logs in GitHub Actions
2. Look for error messages in the build steps
3. Fix the issue locally and test:
   ```bash
   cd package-name
   jlpm install && jlpm build:prod && python -m build
   ```
4. Commit fixes, then create a new tag (e.g., `v0.9.7`)

### Publish Fails

If publishing to PyPI fails:

1. **Check PyPI Trusted Publishing setup:** Verify environments and pending publishers
2. **Check GitHub Environments:** Ensure environments exist and have correct names
3. **Partial publish (only some packages published):**
   - The workflow will stop if any package fails
   - Fix the issue and create a new patch version
   - PyPI doesn't allow re-uploading the same version

### Rollback a Release

If you need to rollback:

1. **Delete the git tag:**
   ```bash
   git tag -d v0.9.6
   git push origin :refs/tags/v0.9.6
   ```

2. **Yank the PyPI release (can't delete):**
   - Go to PyPI project page → Manage → Releases
   - Select the version → "Yank release"
   - This hides it from `pip install` but doesn't delete it

3. **Release a fixed version:**
   - Fix the issue
   - Create a new tag (e.g., `v0.9.7`)

## Manual Release (Emergency)

If the automated workflow is broken, you can release manually:

```bash
# 1. Update versions manually
python .github/scripts/update_versions.py 0.9.6

# 2. Build all packages
cd jupyterlab-amphi
jlpm install && jlpm build:prod && python -m build
cd ../amphi-scheduler
jlpm install && jlpm build:prod && python -m build
cd ../amphi-etl
jlpm install && jlpm build:prod && python -m build
cd ..

# 3. Install twine
pip install twine

# 4. Upload to PyPI (requires API token)
# Set TWINE_USERNAME=__token__
# Set TWINE_PASSWORD=<your-pypi-token>
twine upload jupyterlab-amphi/dist/*
twine upload amphi-scheduler/dist/*
twine upload amphi-etl/dist/*
```

**Note:** Manual releases require PyPI API tokens. Store tokens securely.

## Testing the Workflow

To test the workflow without publishing to production PyPI:

### Option 1: Use TestPyPI

1. Create a test branch
2. Modify `.github/workflows/pypi-publish.yml`:
   ```yaml
   - name: Publish to TestPyPI
     uses: pypa/gh-action-pypi-publish@release/v1
     with:
       repository-url: https://test.pypi.org/legacy/
       packages-dir: jupyterlab-amphi/dist/
   ```
3. Configure TestPyPI trusted publishing (same process as PyPI)
4. Push a test tag: `git tag v0.9.6-test && git push origin v0.9.6-test`

### Option 2: Dry Run Locally

Test the build process locally without publishing:

```bash
# Test version update script
python .github/scripts/update_versions.py 0.9.6

# Test builds
cd jupyterlab-amphi && jlpm install && jlpm build:prod && python -m build && cd ..
cd amphi-scheduler && jlpm install && jlpm build:prod && python -m build && cd ..
cd amphi-etl && jlpm install && jlpm build:prod && python -m build && cd ..
```

## Version Numbering

Amphi ETL follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR** (1.0.0): Breaking changes, incompatible API changes
- **MINOR** (0.9.0): New features, backwards compatible
- **PATCH** (0.9.6): Bug fixes, backwards compatible

All three packages share the same version number and are released together.

## Support

- **Issues:** https://github.com/amphi-ai/amphi-etl/issues
- **Documentation:** https://docs.amphi.ai
