# Check for "clean" parameter
if [ "$1" == "clean" ]; then
    echo "Cleaning up..."
    rm -rf dist/ amphi_venv/ build/ node_modules/ amphi/ amphi.egg-info .jupyterlite.doit.db package-lock.json yarn.lock # Replace with the directory you want to remove

    if [ "$2" == "deep" ]; then
    echo "Deep Cleaning"

    find packages -type f -name 'tsconfig.tsbuildinfo' -exec rm {} + -o -type d \( -name 'lib' -o -name 'node_modules' \) -exec rm -rf {} +

    fi
    # :point_down:️ clean npm cache
    npm cache clean --force
    exit 0 # Exit after cleaning    
fi

jlpm install
jlpm run build
python3 -m pip install .