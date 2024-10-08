
import { KernelMessage } from '@jupyterlab/services';
import { PromiseDelegate, ReadonlyJSONValue, ReadonlyPartialJSONObject, Token } from '@lumino/coreutils';

// RunService.ts
export class RunService {
    static executeCommand(commands: any, commandId: string) {
      commands.execute(commandId, {}).catch(reason => {
        console.error(
          `An error occurred during the execution of ${commandId}.\n${reason}`
        );
      });
    }
  
    static showErrorNotification(Notification: any, message: string) {
      Notification.error(message, {
        actions: [
          {
            label: 'Try to reload the application and run again.',
            callback: () => location.reload()
          }
        ],
        autoClose: 6000
      });
    }
  
    static checkSessionAndKernel(
      Notification: any,
      current: any
    ): boolean {
      if (
        !current.context.sessionContext ||
        !current.context.sessionContext.session
      ) {
        RunService.showErrorNotification(
          Notification,
          'The pipeline cannot be run because the local Python engine cannot be found.'
        );
        return false;
      }
  
      if (current.context.sessionContext.hasNoKernel) {
        RunService.showErrorNotification(
          Notification,
          'The pipeline cannot be run because no processing engine can be found.'
        );
        return false;
      }
  
      return true;
    }
  
    static async executeKernelCode(session: any, code: string) {
      const future = session.kernel.requestExecute({ code });
  
      future.onIOPub = (msg: any) => {
        if (msg.header.msg_type === 'stream') {
          // Handle stream messages if necessary
        } else if (msg.header.msg_type === 'error') {
          // Handle error messages
          const errorMsg = msg as KernelMessage.IErrorMsg;
          const errorOutput = errorMsg.content;
  
          console.error(
            `Received error: ${errorOutput.ename}: ${errorOutput.evalue}`
          );
        }
      };
  
      return future.done;
    }
  
    static async executeKernelCodeWithNotifications(
        Notification: any,
        session: any,
        code: string,
        notificationOptions: any = {}
      ): Promise<{ delayInSeconds: string }> {
        const start = performance.now();
      
        const notificationPromise = new Promise<{ delayInSeconds: string }>((resolve, reject) => {
          const future = session.kernel.requestExecute({ code });
      
          future.onReply = (reply: any) => {
            const end = performance.now();
            const delay = end - start;
            const delayInSeconds = (delay / 1000).toFixed(1);
      
            if (reply.content.status === 'ok') {
              resolve({ delayInSeconds });
            } else {
              reject(new Error(`Execution failed: ${reply.content.status}`));
            }
          };
      
          future.onDone = () => {
            // This is a fallback in case onReply wasn't called
            const end = performance.now();
            const delay = end - start;
            const delayInSeconds = (delay / 1000).toFixed(1);
            resolve({ delayInSeconds });
          };
        });
      
        Notification.promise(notificationPromise, notificationOptions);
      
        return notificationPromise;
      }
  
    static extractDependencies(code: string): string[] {
      const lines = code.split(/\r?\n/);
      const dependencyLine = lines[2];
      const dependencies = dependencyLine.startsWith(
        '# Additional dependencies: '
      )
        ? dependencyLine
            .split(': ')[1]
            .split(',')
            .map(pkg => pkg.trim())
        : [];
      return dependencies;
    }

    static async executeMultipleKernelCodesWithNotifications(
        Notification: any,
        session: any,
        codes: string[],
        notificationOptions: any = {}
      ) {
        console.log('Starting execution of multiple kernel codes.');
      
        const delegate = new PromiseDelegate<ReadonlyJSONValue>();
        const start = performance.now();
      
        console.log('Notification promise setup initiated.');
        Notification.promise(delegate.promise, notificationOptions);
      
        try {
          for (const code of codes) {      
            const future = session.kernel.requestExecute({ code });      
            await new Promise<void>((resolve, reject) => {
              future.onReply = (reply: any) => {      
                if (reply.content.status !== 'ok') {
                  reject(new Error('Kernel execution error'));
                }
              };
      
              future.onIOPub = (msg: any) => {
      
                if (msg.header.msg_type === 'error') {
                  const errorMsg = msg as KernelMessage.IErrorMsg;
                  const errorOutput = errorMsg.content;
      
                  console.error(
                    `Received error: ${errorOutput.ename}: ${errorOutput.evalue}`
                  );
                  reject(
                    new Error(
                      `Received error: ${errorOutput.ename}: ${errorOutput.evalue}`
                    )
                  );
                }
              };
      
              future.onDone = () => {
                console.log('Kernel execution done for this code.');
                resolve();
              };
            });
          }
      
          const end = performance.now();
          const delay = end - start;
          const delayInSeconds = (delay / 1000).toFixed(1);
      
          console.log(`Execution finished successfully in ${delayInSeconds} seconds.`);
          delegate.resolve({ delayInSeconds });
        } catch (error) {
          const end = performance.now();
          const delay = end - start;
          const delayInSeconds = (delay / 1000).toFixed(1);
      
          console.error(`Execution failed after ${delayInSeconds} seconds.`, error);
          delegate.reject({ delayInSeconds, error });
        }
      
        console.log('Returning final delegate promise.');
        return delegate.promise;
      }
      
  }
  