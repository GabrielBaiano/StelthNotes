#include <node_api.h>
#include <assert.h>
#include <windows.h>

// Função para definir DisplayAffinity de uma janela
napi_value SetWindowDisplayAffinity(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_status status;
    
    status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
    assert(status == napi_ok);
    
    if (argc < 1) {
        napi_throw_error(env, NULL, "Esperado handle da janela (HWND) como número");
        return NULL;
    }
    
    int64_t hwnd_value;
    status = napi_get_value_int64(env, args[0], &hwnd_value);
    assert(status == napi_ok);
    
    HWND hwnd = reinterpret_cast<HWND>(hwnd_value);
    DWORD affinity = 0x00000011;  // WDA_EXCLUDEFROMCAPTURE
    
    BOOL result = ::SetWindowDisplayAffinity(hwnd, affinity);
    
    napi_value js_result;
    status = napi_get_boolean(env, result != 0, &js_result);
    assert(status == napi_ok);
    
    return js_result;
}

// Função para obter handle da janela por título
napi_value GetWindowByTitle(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_status status;
    
    status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
    assert(status == napi_ok);
    
    if (argc < 1) {
        napi_throw_error(env, NULL, "Esperado título da janela como string");
        return NULL;
    }
    
    size_t str_size;
    status = napi_get_value_string_utf8(env, args[0], NULL, 0, &str_size);
    assert(status == napi_ok);
    
    char* title = new char[str_size + 1];
    status = napi_get_value_string_utf8(env, args[0], title, str_size + 1, &str_size);
    assert(status == napi_ok);
    
    HWND hwnd = FindWindowA(NULL, title);
    delete[] title;
    
    napi_value js_result;
    if (hwnd == NULL) {
        status = napi_get_null(env, &js_result);
    } else {
        status = napi_create_int64(env, reinterpret_cast<int64_t>(hwnd), &js_result);
    }
    assert(status == napi_ok);
    
    return js_result;
}

// Função para remover DisplayAffinity
napi_value RemoveWindowDisplayAffinity(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_status status;
    
    status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
    assert(status == napi_ok);
    
    if (argc < 1) {
        napi_throw_error(env, NULL, "Esperado handle da janela (HWND) como número");
        return NULL;
    }
    
    int64_t hwnd_value;
    status = napi_get_value_int64(env, args[0], &hwnd_value);
    assert(status == napi_ok);
    
    HWND hwnd = reinterpret_cast<HWND>(hwnd_value);
    
    BOOL result = ::SetWindowDisplayAffinity(hwnd, 0x00000000);  // WDA_NONE
    
    napi_value js_result;
    status = napi_get_boolean(env, result != 0, &js_result);
    assert(status == napi_ok);
    
    return js_result;
}

// Inicialização do módulo
napi_value Init(napi_env env, napi_value exports) {
    napi_status status;
    napi_value fn;
    
    status = napi_create_function(env, NULL, 0, SetWindowDisplayAffinity, NULL, &fn);
    assert(status == napi_ok);
    status = napi_set_named_property(env, exports, "setWindowDisplayAffinity", fn);
    assert(status == napi_ok);
    
    status = napi_create_function(env, NULL, 0, GetWindowByTitle, NULL, &fn);
    assert(status == napi_ok);
    status = napi_set_named_property(env, exports, "getWindowByTitle", fn);
    assert(status == napi_ok);
    
    status = napi_create_function(env, NULL, 0, RemoveWindowDisplayAffinity, NULL, &fn);
    assert(status == napi_ok);
    status = napi_set_named_property(env, exports, "removeWindowDisplayAffinity", fn);
    assert(status == napi_ok);
    
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)