// 輸出 /hcsi-lab/i18n/en.json（固定網址，不帶雜湊，避免快取中的舊 HTML 找不到檔案）
import { buildDict } from '../../i18n';

export const GET = () => new Response(JSON.stringify(buildDict('en')), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
