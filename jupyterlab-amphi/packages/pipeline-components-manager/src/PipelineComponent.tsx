import { LabIcon } from '@jupyterlab/ui-components';
import { ComponentItem } from './index';

export function PipelineComponent<T extends ComponentItem>() {

  return class implements ComponentItem {

    public static instance: T;
    public _name: string;
    public _id: string;
    public _type: string;
    public _icon: any;
    public _default: object;
    public _form: object;

    public constructor() { }

    public static getInstance(): T {
      if (!this.instance) {
        this.instance = new this() as unknown as T;
      }
      return this.instance;
    }

    public static get Name() {
      const instance = this.getInstance();
      return instance._name;
    }

    public static get Type() {
      const instance = this.getInstance();
      return instance._type;
    }

    // Static getter for the icon
    public static get Icon() {
      const instance = this.getInstance();
      return instance._icon;
    }

    // Static getter for the default config
    public static get Default() {
      const instance = this.getInstance();
      return instance._default;
    }

    // Static getter for the default config
    public static get Form() {
      const instance = this.getInstance();
      return instance._form;
    }

    // Static method to update the type
    public static updateType(newType: string) {
      const instance = this.getInstance();
      instance._type = newType;
    }
  }
}

export interface ConfigFormProps {
  nodeId: string;
  data: any;
  manager: any;
  store: StoreApi;
  setNodes: any;
}

export interface StoreApi {
  getState: () => { nodeInternals: Map<string, any> };
  // ... other necessary methods and properties
}