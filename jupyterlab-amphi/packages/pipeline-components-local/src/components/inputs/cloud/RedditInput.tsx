import { redditIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';



export class RedditInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { submission: "all", limit: 20, sort: "hot", userAgent: "Submission extraction by Amphi" };
    const form = {
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
          placeholder: "Submission extraction by username",
          advanced: true
        }
      ],
    };

    super("Reddit Input", "redditInput", "no desc", "pandas_df_input", [], "inputs", redditIcon, defaultConfig, form);
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
