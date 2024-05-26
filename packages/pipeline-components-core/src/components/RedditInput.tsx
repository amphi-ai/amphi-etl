import { ComponentItem, PipelineComponent, generateUIFormComponent, onChange, renderComponentUI, renderHandle, setDefaultConfig, createZoomSelector } from '@amphi/pipeline-components-manager';
import React, { useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore, useStoreApi } from 'reactflow';
import { redditIcon } from '../icons';

export class RedditInput extends PipelineComponent<ComponentItem>() {
  public _name = "Reddit Input";
  public _id = "redditInput";
  public _type = "pandas_df_input";
  public _category = "input.API";
  public _icon = redditIcon; // Placeholder for the Reddit icon
  public _default = { submission: "all", limit: 20, sort: "hot", userAgent: "Sumbission extraction by Amphi" };
  public _form = {
    idPrefix: "component__form",
    fields: [
      {
        type: "input",
        label: "Submission",
        id: "submission",
        placeholder: "URL or id",
      },
      {
        type: "input",
        label: "Limit",
        id: "limit",
        placeholder: "Number of posts to fetch",
        advanced: true
      },
      {
        type: "input",
        label: "Client ID",
        id: "clientId",
        placeholder: "Reddit Client ID",
        advanced: true
      },
      {
        type: "input",
        label: "Secret ID",
        id: "secretId",
        placeholder: "Reddit Secret ID",
        advanced: true
      },
      {
        type: "input",
        label: "User Agent",
        id: "userAgent",
        placeholder: "Sumbission extraction by username",
        advanced: true
      }
    ],
  };

  public static ConfigForm = ({
    nodeId,
    data,
    context,
    componentService,
    manager,
    commands,
    store,
    setNodes
  }) => {
    const defaultConfig = this.Default; // Define your default config

    const handleSetDefaultConfig = useCallback(() => {
      setDefaultConfig({ nodeId, store, setNodes, defaultConfig });
    }, [nodeId, store, setNodes, defaultConfig]);

    useEffect(() => {
      handleSetDefaultConfig();
    }, [handleSetDefaultConfig]);

    const handleChange = useCallback((evtTargetValue: any, field: string) => {
      onChange({ evtTargetValue, field, nodeId, store, setNodes });
    }, [nodeId, store, setNodes]);

    return (
      <>
        {generateUIFormComponent({
          nodeId: nodeId,
          type: this.Type,
          name: this.Name,
          form: this.Form,
          data: data,
          context: context,
          componentService: componentService,
          manager: manager,
          commands: commands,
          handleChange: handleChange,
        })}
      </>
    );
  }

  public UIComponent({ id, data, context, componentService, manager, commands }) {

    const { setNodes, deleteElements, setViewport } = useReactFlow();
    const store = useStoreApi();

    const deleteNode = useCallback(() => {
      deleteElements({ nodes: [{ id }] });
    }, [id, deleteElements]);

  const zoomSelector = createZoomSelector();
  const showContent = useStore(zoomSelector);
  
  const selector = (s) => ({
    nodeInternals: s.nodeInternals,
    edges: s.edges,
  });

  const { nodeInternals, edges } = useStore(selector);
  const nodeId = id;
  const internals = { nodeInternals, edges, nodeId }


    // Create the handle element
    const handleElement = React.createElement(renderHandle, {
      type: RedditInput.Type,
      Handle: Handle, // Make sure Handle is imported or defined
      Position: Position, // Make sure Position is imported or defined
      internals: internals    
    });

    return (
      <>
        {renderComponentUI({
          id: id,
          data: data,
          context: context,
          manager: manager,
          commands: commands,
          name: RedditInput.Name,
          ConfigForm: RedditInput.ConfigForm({ nodeId: id, data, context, componentService, manager, commands, store, setNodes }),
          Icon: RedditInput.Icon,
          showContent: showContent,
          handle: handleElement,
          deleteNode: deleteNode,
          setViewport: setViewport
        })}
      </>
    );
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "import praw", "from praw.models import MoreComments"];
  }

  public generateComponentCode({ config, outputName }): string {
    const submission = config.submission;
    const limit = config.limit || 10;
  
    // Check if the subreddit is a URL or an ID
    const isUrl = submission.startsWith('http') || submission.startsWith('www');
    const submissionAccess = isUrl
      ? `${outputName}_submission = ${outputName}_reddit.submission(url="${submission}")`
      : `${outputName}_submission = ${outputName}_reddit.submission("${submission}")`;
  
    const code = `
${outputName}_reddit = praw.Reddit(client_id="${config.clientId}", client_secret="${config.secretId}", user_agent="${config.userAgent}")
${submissionAccess}

${outputName}_comments_data = []
${outputName}_submission.comments.replace_more(limit=${limit})
for comment in ${outputName}_submission.comments.list():
    ${outputName}_comments_data.append({
        "comment_id": comment.id,
        "comment_body": comment.body,
        "comment_author": comment.author.name if comment.author else None,
        "comment_score": comment.score,
        "comment_created_utc": comment.created_utc,
        "parent_id": comment.parent_id
    })

${outputName} = pd.DataFrame(${outputName}_comments_data)
`;
    return code;
  }
  

}
