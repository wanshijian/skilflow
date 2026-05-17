"""
Docker 沙箱代码执行器
接收代码字符串，在受限环境中执行，返回 stdout/stderr
"""
import sys
import io
import traceback
import signal
import json
import ast
from typing import Dict, Any

# 禁用的内置函数和模块
BLACKLISTED_IMPORTS = {
    'os', 'subprocess', 'shutil', 'socket', 'http', 'urllib',
    'ftplib', 'smtplib', 'telnetlib', 'ctypes', 'multiprocessing',
    'signal', 'sys', 'importlib', 'inspect', 'compile', 'eval'
}

BLACKLISTED_BUILTINS = {
    'exec', 'eval', 'compile', 'open', '__import__',
    'globals', 'locals', 'getattr', 'setattr', 'delattr'
}

class TimeoutError(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutError("Code execution timed out (30s limit)")

def validate_code_safety(code: str) -> bool:
    """静态检查代码安全性"""
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            # 检查 import 语句
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.split('.')[0] in BLACKLISTED_IMPORTS:
                        return False
            elif isinstance(node, ast.ImportFrom):
                if node.module and node.module.split('.')[0] in BLACKLISTED_IMPORTS:
                    return False
            # 检查危险函数调用
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in BLACKLISTED_BUILTINS:
                        return False
    except SyntaxError:
        pass  # 语法错误会在执行时捕获
    return True

def execute_code(code: str, language: str = 'python') -> Dict[str, Any]:
    """在受限环境中执行代码"""
    result = {
        'success': False,
        'stdout': '',
        'stderr': '',
        'error': None,
        'execution_time_ms': 0
    }

    if language != 'python':
        return {**result, 'error': f'Unsupported language: {language}'}

    # 安全检查
    if not validate_code_safety(code):
        return {**result, 'error': 'Code rejected: contains unsafe operations'}

    # 捕获标准输出
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = io.StringIO()
    sys.stderr = io.StringIO()

    # 设置超时（30秒）
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(30)

    import time
    start_time = time.time()

    try:
        # 创建受限的全局命名空间
        safe_globals = {
            '__builtins__': {
                k: v for k, v in __builtins__.items()
                if k not in BLACKLISTED_BUILTINS
            },
            '__name__': '__main__',
        }

        # 添加白名单导入
        safe_globals['__builtins__']['__import__'] = lambda name, *args, **kwargs: (
            __import__(name, *args, **kwargs)
            if name.split('.')[0] not in BLACKLISTED_IMPORTS
            else (_ for _ in ()).throw(ImportError(f"Module '{name}' is not allowed"))
        )

        exec(code, safe_globals)
        result['success'] = True
    except TimeoutError:
        result['error'] = 'Execution timed out (30 seconds limit)'
    except Exception as e:
        result['error'] = f'{type(e).__name__}: {str(e)}'
        result['stderr'] = traceback.format_exc()
    finally:
        signal.alarm(0)  # 取消超时
        result['stdout'] = sys.stdout.getvalue()
        if not result['stderr']:
            result['stderr'] = sys.stderr.getvalue()
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        result['execution_time_ms'] = round((time.time() - start_time) * 1000)

    return result

if __name__ == '__main__':
    # 命令行模式
    import argparse
    parser = argparse.ArgumentParser(description='Sandbox code executor')
    parser.add_argument('--code', type=str, help='Code to execute')
    parser.add_argument('--file', type=str, help='Code file to execute')
    parser.add_argument('--lang', type=str, default='python', help='Language')
    args = parser.parse_args()

    code = args.code
    if args.file:
        with open(args.file, 'r') as f:
            code = f.read()

    if not code:
        print(json.dumps({'error': 'No code provided'}))
        sys.exit(1)

    result = execute_code(code, args.lang)
    print(json.dumps(result, indent=2))
