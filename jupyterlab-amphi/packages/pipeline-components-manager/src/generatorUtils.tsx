
// Import necessary hooks and other dependencies


export const getOutputType = (dataTypeMapping: { [key: string]: string }, pandasDtype: string): string | undefined => {
    // Check for direct matches first
    if (dataTypeMapping[pandasDtype]) {
        return dataTypeMapping[pandasDtype];
    }

    // Handle patterns like "datetime*" or "datetime64[*]"
    for (const key in dataTypeMapping) {
        const pattern = new RegExp('^' + key.replace(/\[\*\]/, '\\[.*\\]').replace('*', '.*') + '$');
        if (pattern.test(pandasDtype)) {
            return dataTypeMapping[key];
        }
    }

    return undefined; // Return undefined if no match is found
};