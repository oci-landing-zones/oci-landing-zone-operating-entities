//go:build js && wasm

package main

import (
	"fmt"
	"path"
	"syscall/js"

	"github.com/google/go-jsonnet"
)

type memoryImporter struct {
	files    map[string]string
	contents map[string]jsonnet.Contents
}

// Import implements go-jsonnet's importer identity contract for Studio's
// in-memory filesystem. foundAt is always the canonical virtual path, and a
// path always returns the same Contents instance for the lifetime of the VM.
// The upstream browser importer currently does neither for repeated or nested
// imports, which is why Studio maintains this small wrapper.
func (importer *memoryImporter) Import(importedFrom, importedPath string) (jsonnet.Contents, string, error) {
	fullPath := importedPath
	if !path.IsAbs(importedPath) {
		fullPath = path.Join(path.Dir(importedFrom), importedPath)
	}
	fullPath = path.Clean(fullPath)

	source, exists := importer.files[fullPath]
	if !exists {
		return jsonnet.Contents{}, "", fmt.Errorf("File not found %v", fullPath)
	}

	if contents, exists := importer.contents[fullPath]; exists {
		return contents, fullPath, nil
	}

	contents := jsonnet.MakeContents(source)
	importer.contents[fullPath] = contents
	return contents, fullPath, nil
}

func processObjectParam(name string, value js.Value) (map[string]string, error) {
	if value.Type() != js.TypeObject {
		return nil, fmt.Errorf("%q was not an object", name)
	}

	keys := js.Global().Get("Object").Get("keys").Invoke(value)
	result := make(map[string]string, keys.Length())
	for i := 0; i < keys.Length(); i++ {
		key := keys.Index(i).String()
		keyValue := value.Get(key)
		if keyValue.Type() != js.TypeString {
			return nil, fmt.Errorf("%q key %q was not bound to a string", name, key)
		}
		result[key] = keyValue.String()
	}
	return result, nil
}

func jsonnetEvaluateSnippet(this js.Value, params []js.Value) (interface{}, error) {
	if len(params) != 7 {
		return "", fmt.Errorf("wrong number of parameters: %d", len(params))
	}
	if params[0].Type() != js.TypeString {
		return "", fmt.Errorf("filename was not a string")
	}
	if params[1].Type() != js.TypeString {
		return "", fmt.Errorf("code was not a string")
	}

	filename := params[0].String()
	code := params[1].String()
	files, err := processObjectParam("files", params[2])
	if err != nil {
		return "", err
	}
	extStrs, err := processObjectParam("extStrs", params[3])
	if err != nil {
		return "", err
	}
	extCodes, err := processObjectParam("extCodes", params[4])
	if err != nil {
		return "", err
	}
	tlaStrs, err := processObjectParam("tlaStrs", params[5])
	if err != nil {
		return "", err
	}
	tlaCodes, err := processObjectParam("tlaCodes", params[6])
	if err != nil {
		return "", err
	}

	vm := jsonnet.MakeVM()
	vm.Importer(&memoryImporter{
		files:    files,
		contents: map[string]jsonnet.Contents{},
	})
	for key, val := range extStrs {
		vm.ExtVar(key, val)
	}
	for key, val := range extCodes {
		vm.ExtCode(key, val)
	}
	for key, val := range tlaStrs {
		vm.TLAVar(key, val)
	}
	for key, val := range tlaCodes {
		vm.TLACode(key, val)
	}

	return vm.EvaluateAnonymousSnippet(filename, code)
}

func promiseFuncOf(fn func(js.Value, []js.Value) (interface{}, error)) js.Func {
	return js.FuncOf(func(this js.Value, params []js.Value) interface{} {
		return js.Global().Get("Promise").New(js.FuncOf(func(_ js.Value, args []js.Value) interface{} {
			resolve := args[0]
			reject := args[1]
			go func() {
				value, err := fn(this, params)
				if err != nil {
					reject.Invoke(js.Global().Get("Error").New(err.Error()))
					return
				}
				resolve.Invoke(value)
			}()
			return nil
		}))
	})
}

func main() {
	js.Global().Set("jsonnet_evaluate_snippet", promiseFuncOf(jsonnetEvaluateSnippet))
	<-make(chan bool)
}
