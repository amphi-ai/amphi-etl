import { mongodbIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';

export class MongoDBInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
      connectionString: "",
      databaseName: "",
      collectionName: "",
      limit: ""
    };

    const form = {
      fields: [
        {
          type: "input",
          label: "Connection String",
          id: "connectionString",
          placeholder:
            "mongodb+srv://user:pass@cluster0.example.mongodb.net/?retryWrites=true&w=majority",
          connection: "MongoDB",
          advanced: true
        },
        {
          type: "input",
          label: "Database Name",
          id: "databaseName",
          placeholder: "Enter database name",
          connection: "MongoDB"
        },
        {
          type: "input",
          label: "Collection Name",
          id: "collectionName",
          placeholder: "Enter collection name",
          connection: "MongoDB"
        },
        {
          type: "input",
          label: "Limit",
          id: "limit",
          inputType: "number",
          placeholder: "Optional limit e.g. 100",
          advanced: true
        }
      ]
    };

    const description =
      "Use MongoDB Input to retrieve all documents from a MongoDB collection. Output is converted to a pandas DataFrame.";

    super(
      "MongoDB Input",
      "mongoDBInput",
      description,
      "pandas_df_input",
      [],
      "inputs",
      mongodbIcon,
      defaultConfig,
      form
    );
  }

  public provideDependencies({ config }): string[] {
    return ["pymongo[srv]"];
  }

  public provideImports({ config }): string[] {
    return ["import pandas as pd", "from pymongo import MongoClient"];
  }

  public provideFunctions({ config }): string[] {
    const fn = `
def mongodb_to_dataframe(connection_string, database_name, collection_name, limit=None):
    with MongoClient(connection_string) as client:
        db = client[database_name]
        collection = db[collection_name]
        cursor = collection.find({})
        if limit is not None:
            cursor = cursor.limit(int(limit))
        documents = list(cursor)
        for doc in documents:
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])
        return pd.DataFrame(documents) if documents else pd.DataFrame()
`;
    return [fn];
  }

  public generateComponentCode({ config, outputName }): string {
    const connectionString = (config.connectionString || "").replace(/"/g, '\\"');
    const databaseName = (config.databaseName || "").replace(/"/g, '\\"');
    const collectionName = (config.collectionName?.value ?? config.collectionName ?? "").replace(/"/g, '\\"');
    const limit = config.limit ? parseInt(config.limit, 10) : null;

    return `
${outputName} = mongodb_to_dataframe("${connectionString}", "${databaseName}", "${collectionName}", ${limit !== null ? limit : "None"})
`.trim();
  }
}
