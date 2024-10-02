import { filterIcon } from '../../icons';
import { BaseCoreComponent } from '../BaseCoreComponent';

export class EmailLogger extends BaseCoreComponent {
  constructor() {
    const defaultConfig = { smtpServer: "smtp.example.com", smtpPort: 587 };
    const form = {
      idPrefix: "component__form",
      fields: [
        {
          type: "input",
          label: "Receiver Email",
          id: "receiverEmail",
          placeholder: "Receiver Email"
        },
        {
          type: "input",
          label: "Sender Email",
          id: "senderEmail",
          placeholder: "Sender Email",
          advanced: true
        },
        {
          type: "input",
          label: "Sender Password",
          id: "senderPassword",
          placeholder: "Sender Password",
          advanced: true
        },
        {
          type: "input",
          label: "SMTP server",
          id: "smtpServer",
          placeholder: "smtp.example.com",
          advanced: true
        },
        {
          type: "input",
          label: "SMTP port",
          id: "smtpPort",
          placeholder: "587",
          advanced: true
        },
        {
          type: "input",
          label: "Subject",
          id: "emailSubject",
          placeholder: "Pipeline Failure",
          advanced: true
        },
        {
          type: "textarea",
          label: "Email Content",
          id: "emailContent",
          placeholder: "An error occurred in the script:\n\n{error_message}",
          advanced: true
        },
      ],
    };

    super("Email Logger", "emailLogger", "no desc", "logger", [], "settings", filterIcon, defaultConfig, form);
  }
  
  public provideImports({config}): string[] {
    return ["import smtplib", "from email.mime.text import MIMEText", "from email.mime.multipart import MIMEMultipart"];
  }

  public provideFunctions({config}): string[] {
    let functions = [];
    const code = `
def send_email(error_message):
    sender_email = "${config.senderEmail}"
    receiver_email = "${config.receiverEmail}"
    password =

    message = MIMEMultipart("alternative")
    message["Subject"] = "Script Failure Notification"
    message["From"] = sender_email
    message["To"] = receiver_email

    text =  "${config.emailContent}"
    part1 = MIMEText(text, "plain")
    message.attach(part1)

    server = smtplib.SMTP('${config.smtpServer}', ${config.smtpPort})
    server.starttls()
    server.login(sender_email, password)
    server.sendmail(sender_email, receiver_email, message.as_string())
    server.quit()
    `;
    functions.push(code)
    return functions;
  }

  public generateComponentCode({config}): string {
    const code = `
# Send email
send_email(str(e))
`;
    return code;
  }

}