import React from 'react';

export function createAboutDialog(versionNumber) {
  const versionInfo = (
    <span className="jp-About-version-info">
      <span className="jp-About-version">v{versionNumber}</span>
    </span>
  );

  const title = (
    <span className="jp-About-header">
      <img
        src="https://amphi.ai/icons/amphi_logo_paths.svg"
        alt="Amphi Logo"
        className="amphi-logo"
        style={{ height: '24px', marginRight: '10px', verticalAlign: 'middle' }}
      />
      <div className="jp-About-header-info" style={{ display: 'inline-block', textAlign: 'center' }}>
        {versionInfo}
      </div>
    </span>
  );

  const websiteURL = 'https://amphi.ai';
  const githubURL = 'https://github.com/amphi-ai/amphi-etl';

  const externalLinks = (
    <span className="jp-About-externalLinks">
      <a href={websiteURL} target="_blank" rel="noopener noreferrer" className="jp-Button-flat">WEBSITE</a>
      <a href={githubURL} target="_blank" rel="noopener noreferrer" className="jp-Button-flat">GITHUB</a>
    </span>
  );

  const copyright = (
    <span className="jp-About-copyright" >© 2024 Amphi</span>
  );

  const body = (
    <div className="jp-About-body">
      {externalLinks}
      {copyright}
    </div>
  );

  return { title, body };
}
