import { apiIcon } from '../../../icons';
import { BaseCoreComponent } from '../../BaseCoreComponent';// Adjust the import path

export class RestInput extends BaseCoreComponent {
  constructor() {
    const defaultConfig = {
		tsCFSelectRestApiUrl : "",
		tsCFSelectRestApiMethod : "GET",
		tsCFkeyvalueRestApiParams : [],
		tsCFkeyvalueRestApiHeaders : [],
		tsCFSelectRestApiBodyMimeType : "Raw JSON",
		tsCFkeyvalueRestApiBodyURLEncoded : [],
		tsCFtextareaRestApiBodyRaw : "",
		tsCFtextareaRestApiBodyJSON : "",
		tsCFbooleanRestApiResponseAsString : false,
        tsCFfileRestApiDownloadFilePath : "",
        tsCFkeyvalueRestApiUploadFilePaths : []
	};
    const form = {
      idPrefix: 'component__form_name_input_hello_df',
      fields: [
        {
          type: "input",
          label: "URL",
          id: "tsCFSelectRestApiUrl",
          placeholder: "Endpoint URL",
          advanced: false
        },
        {
          type: "select",
          label: "Method",
          id: "tsCFSelectRestApiMethod",
          options: [
            { value: "GET", label: "GET", tooltip: "Retrieve data from the server without modifying resources." },
            { value: "POST", label: "POST", tooltip: "Create a new resource or trigger a server-side operation." },
            { value: "PUT", label: "PUT", tooltip: "Replace an existing resource with the provided representation." },
            { value: "DELETE", label: "DELETE", tooltip: "Remove a resource from the server." },
            { value: "PATCH", label: "PATCH", tooltip: "Apply partial updates to an existing resource." },
            { value: "OPTIONS", label: "OPTIONS", tooltip: "Discover supported HTTP methods and server capabilities." },
            { value: "HEAD", label: "HEAD", tooltip: "Retrieve response headers without the response body." },
            { value: "TRACE", label: "TRACE", tooltip: "Echo the received request for debugging and diagnostics." },
            { value: "CONNECT", label: "CONNECT", tooltip: "Establish a network tunnel, typically for HTTPS via a proxy." }
          ],
          advanced: false
        },
		{
          type: "keyvalue",
          label: "Params (added to url)",
          id: "tsCFkeyvalueRestApiParams",
          advanced: true
        },
		{
          type: "keyvalue",
          label: "Headers",
          id: "tsCFkeyvalueRestApiHeaders",
          advanced: true
        },
		   {
          type: "select",
          label: "Body Mime Type",
          id: "tsCFSelectRestApiBodyMimeType",
          options: [
            { value: "Form URL Encoded", label: "Form URL Encoded", tooltip: "application/x-www-form-urlencoded - a key value form" },
            { value: "Form Multipart", label: "Form Multipart", tooltip: "multipart/form-data - usually a file " },
            { value: "Raw JSON", label: "Raw JSON", tooltip: "application/json - a json" },
            { value: "Raw XML", label: "Raw XML", tooltip: "application/xml - an xml" },
            { value: "TEXT", label: "TEXT", tooltip: "text/plain - misc text" },
            { value: "None", label: "None", tooltip: "None" }
          ],
          advanced: true
        },
		{
          type: "keyvalue",
          label: "Form",
          id: "tsCFkeyvalueRestApiBodyURLEncoded",
          condition: { tsCFSelectRestApiBodyMimeType: ["Form URL Encoded"]},
          advanced: true
        },
        {
          type: "textarea",
          label: "Body",
          id: "tsCFtextareaRestApiBodyRaw",
          placeholder: "Write body",
          condition: { tsCFSelectRestApiBodyMimeType: ["Raw XML","TEXT"]},
          advanced: true
        },
		{
          type: "textarea",
          label: "Body",
          id: "tsCFtextareaRestApiBodyJSON",
          placeholder: "Write body in JSON",
          condition: { tsCFSelectRestApiBodyMimeType: ["Raw JSON"]},
          advanced: true
        },
		{
          type: "keyvalue",
          label: "Upload File key and path",
          id: "tsCFkeyvalueRestApiUploadFilePaths",
          condition: { tsCFSelectRestApiBodyMimeType: ["Form Multipart"]},
          advanced: true
        },
        {
          type: "boolean",
          label: "Response as String",
          id: "tsCFbooleanRestApiResponseAsString",
          advanced: true
        },
        {
          type: "file",
          label: "Download File path",
          id: "tsCFfileRestApiDownloadFilePath",
          placeholder: "Type file name",
          condition: { tsCFSelectRestApiMethod: ["GET"]},
          advanced: true
        }
      ]
    };
    const description = "Use REST Input to perform GET, PUT, POST, DELETE... requests on REST endpoints.";

    super("REST API Input", "restInput", description, "pandas_df_input", [], "inputs", apiIcon, defaultConfig, form);
  }

  provideImports() {
    return ["import requests",
"import pandas as pd",
"from typing import Optional, Union, Dict, Tuple, List"
];
  }

provideFunctions({ config }): string[] {
    const prefix = config?.backend?.prefix ?? "pd";
    const tsRestAPIInputFunction = `
def py_fn_rest_api_call(
    py_arg_url: str,
    py_arg_method: str = "GET",
    py_arg_params: Optional[Dict[str, str]] = None,    
    py_arg_headers: Optional[Dict[str, str]] = None,
    py_arg_body_mime_type: str = "Form URL Encoded",
    py_arg_body_form: Optional[Dict[str, str]] = None,
    py_arg_body_raw: Optional[Union[str, object]] = None,
    py_arg_body_json: Optional[Union[str, object]] = None,
    py_arg_proxies: Optional[Dict[str, str]] = None,
    py_arg_cert: Optional[Union[str, Tuple[str, str]]] = None,
    py_arg_timeout: Optional[Tuple[int, int]] = None,
    py_arg_response_as_string: bool = False,
    py_arg_upload_file_paths: Optional[Dict[str, str]] = None,
    py_arg_save_path: Optional[str] = None
) -> pd.DataFrame:

    """

    Perform a REST API call using the requests library and return the results as a pandas DataFrame.
 
    Args:

        py_arg_url (str): The URL to send the request to.
        py_arg_method (str, optional): The HTTP method to use. Defaults to "GET".
        py_arg_params (Optional[Dict[str, str]], optional): The params to include in the request (added to query string). Defaults to None.
        py_arg_headers (Optional[Dict[str, str]], optional): The headers to include in the request. Defaults to None.
        py_arg_body_mime_type (str, optional): The type of body to include in the request. Defaults to "Form URL Encoded".
        py_arg_body_form (Optional[Dict[str, str]], optional): The form data to include in the request. Defaults to None.
        py_arg_body_raw (Optional[Union[str, object]], optional): The raw data to include in the request. Defaults to None.
        py_arg_body_json (Optional[Union[str, object]], optional): The json data to include in the request. Defaults to None.
        py_arg_proxies (Optional[Dict[str, str]], optional): The proxies to use for the request. Defaults to None.
        py_arg_cert (Optional[Union[str, Tuple[str, str]]], optional): The SSL client cert file or cert-key pair to use. Defaults to None.
        py_arg_timeout (Optional[Tuple[int, int]], optional): The connect and read timeouts for the request. Defaults to None.
        py_arg_response_as_string (bool, optional): Whether to cast the response body and headers as strings. Defaults to False.
        py_arg_upload_file_paths (Optional[Dict[str, str]], optional): The list of file paths to upload. Defaults to None.
        py_arg_save_path (Optional[str], optional): The path to save the downloaded file. Defaults to None.
    Returns:

        pd.DataFrame: A DataFrame containing the request parameters, response body, and response headers.

    """
 
    # Initialize headers if not provided
    if py_arg_headers is None:
        py_arg_headers = {}
 
    # Add Content-Type header based on body_type if not already specified, except for None and multipart

    content_type_mapping_for_header = {

        "Form URL Encoded": "application/x-www-form-urlencoded",
        #"Form Multipart": "multipart/form-data",
        "Raw JSON": "application/json",
        "Raw XML": "application/xml",
        "TEXT": "text/plain"

    }
 
    if "Content-Type" not in py_arg_headers:

        py_arg_headers["Content-Type"] = content_type_mapping_for_header.get(py_arg_body_mime_type)
 
    # Prepare the request body

    if py_arg_body_mime_type == "Form URL Encoded":

        data = py_arg_body_form
        json = None
        files = None

    elif py_arg_body_mime_type == "Form Multipart":

        data = None
        json = None

    elif py_arg_body_mime_type == "Raw JSON":

        json = py_arg_body_json
        data = None
        files = None

    elif py_arg_body_mime_type == "Raw XML":

        data = py_arg_body_raw
        json = None
        files = None

    elif py_arg_body_mime_type == "TEXT":

        data = py_arg_body_raw
        json = None
        files = None
		
    elif py_arg_body_mime_type == "None":

        data = None
        json = None
        files = None
    else:

        raise ValueError(f"Invalid body type: {py_arg_body_mime_type}")
        
    # Handle file uploads
    if py_arg_upload_file_paths:
        if py_arg_body_mime_type != "Form Multipart":
            raise ValueError("File upload requires body mime type to be 'Form Multipart'")
        #files = [("files", (open(file_path, "rb"))) for file_path in py_arg_upload_file_paths]
        files = []
        for field_name, file_path in py_arg_upload_file_paths.items():
            files.append((field_name, (open(file_path, "rb")))) 
    # Send the request
    try:
        response = requests.request(
            url=py_arg_url,
            method=py_arg_method,
            params=py_arg_params,
            headers=py_arg_headers,
            data=data,
            json=json,
            files=files,
            proxies=py_arg_proxies,
            cert=py_arg_cert,
            timeout=py_arg_timeout
        )		
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        print("HTTP error occurred:", e)
        raise
    except requests.exceptions.RequestException as e:
        print("A request error occurred:", e)
        raise
    # Handle file download
    if py_arg_save_path and response.status_code == 200:
        with open(py_arg_save_path, "wb") as f:
            f.write(response.content) 
			
    # Prepare the response data
    if py_arg_response_as_string:
        response_body = response.text
        response_headers = str(response.headers)
    else:
        response_headers = dict(response.headers)
        #sometimes there may be a charset
        response_body = response.json() if response.headers.get("Content-Type")[:16] == "application/json" else response.text

    # Create the DataFrame
    py_df_rest_api = pd.DataFrame({
        "url": [py_arg_url],
        "method": [py_arg_method],
        "headers": [py_arg_headers],
        "body_mime_type": [py_arg_body_mime_type],
        "body_form": [py_arg_body_form],
        "body_raw": [py_arg_body_raw],
        "proxies": [py_arg_proxies],
        "cert": [py_arg_cert],
        "timeout": [py_arg_timeout],
        "file_paths": [py_arg_upload_file_paths],
        "save_path": [py_arg_save_path],
        "response_as_string": [py_arg_response_as_string],
        "response_body": [response_body],
        "response_headers": [response_headers],
		"response_status_code":[response.status_code]
    })

    # Convert specific columns to string dtype
    py_df_rest_api["url"] = py_df_rest_api["url"].astype("string")
    py_df_rest_api["method"] = py_df_rest_api["method"].astype("string")
    py_df_rest_api["body_mime_type"] = py_df_rest_api["body_mime_type"].astype("string")
    py_df_rest_api["response_status_code"] = py_df_rest_api["response_status_code"].astype("string") 
    py_df_rest_api["save_path"] = py_df_rest_api["save_path"].astype("string")     
    return py_df_rest_api	
	    `;
    return [tsRestAPIInputFunction];
  }
  generateComponentCode({ config, outputName }) {
//Params	  
   let tsConstParams = 'None';
    if (config.tsCFkeyvalueRestApiParams && config.tsCFkeyvalueRestApiParams.length > 0) {
      tsConstParams = '{' + config.tsCFkeyvalueRestApiParams.map(tsCFkeyvalueRestApiParams => `"${tsCFkeyvalueRestApiParams.key}": "${tsCFkeyvalueRestApiParams.value}"`).join(', ') + '}';
    }
//Headers	  
   let tsConstHeaders = 'None';
    if (config.tsCFkeyvalueRestApiHeaders && config.tsCFkeyvalueRestApiHeaders.length > 0) {
      tsConstHeaders = '{' + config.tsCFkeyvalueRestApiHeaders.map(tsCFkeyvalueRestApiHeaders => `"${tsCFkeyvalueRestApiHeaders.key}": "${tsCFkeyvalueRestApiHeaders.value}"`).join(', ') + '}';
    }
//Body--Keep in mind that despite conditions for display, CF values are persisted even if not displayed
// and conditions may have to be also handled in code.
   let tsConstBodyFormURL = 'None';
    if (config.tsCFkeyvalueRestApiBodyURLEncoded && config.tsCFkeyvalueRestApiBodyURLEncoded.length > 0
		&& config.tsCFSelectRestApiBodyMimeType == 'Form URL Encoded'
	) {
      tsConstBodyFormURL = '{' + config.tsCFkeyvalueRestApiBodyURLEncoded.map(tsCFkeyvalueRestApiBodyURLEncoded => `"${tsCFkeyvalueRestApiBodyURLEncoded.key}": "${tsCFkeyvalueRestApiBodyURLEncoded.value}"`).join(', ') + '}';
    }
   let tsConstBodyJSON = 'None';
    if (config.tsCFtextareaRestApiBodyJSON && config.tsCFtextareaRestApiBodyJSON.trim() !== '' 
		&& config.tsCFSelectRestApiBodyMimeType == 'Raw JSON'
		) {
      tsConstBodyJSON=config.tsCFtextareaRestApiBodyJSON;
    }
   let tsConstBodyRaw = 'None';
    if (config.tsCFtextareaRestApiBodyRaw && config.tsCFtextareaRestApiBodyRaw.trim() !== ''
		&& (config.tsCFSelectRestApiBodyMimeType === 'Raw XML' ||config.tsCFSelectRestApiBodyMimeType === 'TEXT')
	) {
      tsConstBodyRaw="'"+config.tsCFtextareaRestApiBodyRaw.trim().replace(/"/g, '\\"').replace(/\n/g, '\\n')+"'";
    }
//Paths	  
   let tsConstDownloadFilePath = 'None';
    if (config.tsCFfileRestApiDownloadFilePath && config.tsCFfileRestApiDownloadFilePath.trim() !== ''
		&& config.tsCFSelectRestApiMethod == 'GET'
	) {
      tsConstDownloadFilePath="'"+config.tsCFfileRestApiDownloadFilePath.trim()+"'";
    }
   let tsConstUploadFilePaths = 'None';
    if (config.tsCFkeyvalueRestApiUploadFilePaths && config.tsCFkeyvalueRestApiUploadFilePaths.length > 0
		&& config.tsCFSelectRestApiBodyMimeType == 'Form Multipart'
	) {
      tsConstUploadFilePaths = '{' + config.tsCFkeyvalueRestApiUploadFilePaths.map(tsCFkeyvalueRestApiUploadFilePaths => `"${tsCFkeyvalueRestApiUploadFilePaths.key}": "${tsCFkeyvalueRestApiUploadFilePaths.value}"`).join(', ') + '}';
    }
//others
   let tsConstRestApiResponseAsString = config.tsCFbooleanRestApiResponseAsString ? 'True' : 'False';
    return `
${outputName} =py_fn_rest_api_call(
    py_arg_url='${config.tsCFSelectRestApiUrl}',
    py_arg_method='${config.tsCFSelectRestApiMethod}',
    py_arg_params = ${tsConstParams},
    py_arg_headers = ${tsConstHeaders},
    py_arg_body_mime_type = '${config.tsCFSelectRestApiBodyMimeType}',
    py_arg_body_form = ${tsConstBodyFormURL},
    py_arg_body_raw =${tsConstBodyRaw},
    py_arg_body_json =${tsConstBodyJSON},
    py_arg_proxies =None,#as of today, not handled
    py_arg_cert = None,#as of today, not handled
    py_arg_timeout = None,#as of today, not handled
    py_arg_response_as_string = ${tsConstRestApiResponseAsString},
    py_arg_upload_file_paths = ${tsConstUploadFilePaths},
    py_arg_save_path = ${tsConstDownloadFilePath}
    )
`.trim();
  }
}