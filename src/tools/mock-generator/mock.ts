/**
 * Mock 假数据生成，零依赖。
 * 所有数据均为随机生成的假数据，仅用于开发测试。
 */

export type FieldKey =
  | 'name'
  | 'phone'
  | 'email'
  | 'idcard'
  | 'city'
  | 'address'
  | 'company'
  | 'ip'
  | 'url'
  | 'date'
  | 'uuid'
  | 'number'
  | 'boolean'

export interface FieldDef {
  key: FieldKey
  label: string
}

/** 字段定义（顺序即输出列顺序） */
export const FIELDS: FieldDef[] = [
  { key: 'name', label: '姓名' },
  { key: 'phone', label: '手机号' },
  { key: 'email', label: '邮箱' },
  { key: 'idcard', label: '身份证号' },
  { key: 'city', label: '城市' },
  { key: 'address', label: '地址' },
  { key: 'company', label: '公司' },
  { key: 'ip', label: 'IP 地址' },
  { key: 'url', label: '网址' },
  { key: 'date', label: '日期时间' },
  { key: 'uuid', label: 'UUID' },
  { key: 'number', label: '数字' },
  { key: 'boolean', label: '布尔值' },
]

const SURNAMES = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘蒋蔡余杜叶程苏魏吕丁沈任姚卢傅钟姜崔谭廖范汪陆金石戴贾韦夏邱方侯邹熊孟秦白江阎薛尹段雷黎史陶毛郝顾龚邵万钱严覃武戚莫孔向汤'.split(
  '',
)
const GIVEN_CHARS = '伟芳娜秀英敏静丽强磊洋勇艳杰娟涛明超霞平刚桂玲兰玉梅文志瑞飞婷鑫宇欣怡梓涵浩然一诺诗琪'.split(
  '',
)

const CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆',
  '苏州', '天津', '长沙', '青岛', '郑州', '宁波', '东莞', '厦门', '福州', '合肥',
]
const DISTRICTS = ['朝阳', '海淀', '浦东', '南山', '天河', '西湖', '武侯', '雁塔', '鼓楼', '江北']
const STREETS = ['中关村', '人民路', '建设街', '科技园', '望江路', '解放碑', '中山路', '滨江大道']
const COMPANY_A = ['宏图', '云智', '恒信', '星辰', '博远', '天成', '锐思', '联创', '华宇', '智联']
const COMPANY_B = ['科技', '网络', '信息', '文化', '贸易', '实业', '数据', '智能']
const EMAIL_DOMAINS = ['gmail.com', 'qq.com', '163.com', 'outlook.com', 'foxmail.com', 'example.com']
const TLDS = ['com', 'cn', 'net', 'io']
const REGION_CODES = [
  '110101', '310104', '440305', '330106', '510104', '420106',
  '320106', '610113', '500105', '120105', '370202', '430102',
]
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')

/** GB 11643 身份证校验位权重与字符表 */
const ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const ID_CHECK = '10X98765432'

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)]
}

function digits(n: number): string {
  let s = ''
  for (let i = 0; i < n; i++) s += randInt(0, 9)
  return s
}

function word(min: number, max: number): string {
  let s = ''
  for (let i = 0, len = randInt(min, max); i < len; i++) s += pick(LETTERS)
  return s
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function mockName(): string {
  let s = pick(SURNAMES)
  for (let i = 0, len = randInt(1, 2); i < len; i++) s += pick(GIVEN_CHARS)
  return s
}

function mockIdCard(): string {
  const year = randInt(1960, 2005)
  const body =
    pick(REGION_CODES) +
    `${year}${pad2(randInt(1, 12))}${pad2(randInt(1, 28))}` +
    digits(3)
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(body[i]) * ID_WEIGHTS[i]
  return body + ID_CHECK[sum % 11]
}

function mockDate(): string {
  const time = randInt(new Date(2000, 0, 1).getTime(), Date.now())
  const d = new Date(time)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )}:${pad2(d.getSeconds())}`
}

export function mockValue(key: FieldKey, numberRange: { min: number; max: number }): string {
  switch (key) {
    case 'name':
      return mockName()
    case 'phone':
      return `1${randInt(3, 9)}${digits(9)}`
    case 'email':
      return `${word(5, 10)}${randInt(1, 99)}@${pick(EMAIL_DOMAINS)}`
    case 'idcard':
      return mockIdCard()
    case 'city':
      return pick(CITIES)
    case 'address':
      return `${pick(CITIES)}${pick(DISTRICTS)}区${pick(STREETS)}${randInt(1, 999)}号`
    case 'company':
      return `${pick(COMPANY_A)}${pick(COMPANY_B)}有限公司`
    case 'ip':
      return `${randInt(1, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`
    case 'url':
      return `https://${word(4, 8)}.${pick(TLDS)}/${word(3, 6)}`
    case 'date':
      return mockDate()
    case 'uuid':
      return crypto.randomUUID()
    case 'number':
      return String(randInt(numberRange.min, numberRange.max))
    case 'boolean':
      return Math.random() < 0.5 ? 'true' : 'false'
  }
}

/** 生成 count 行、每行含 keys 指定字段的假数据 */
export function generateRows(
  keys: FieldKey[],
  count: number,
  numberRange: { min: number; max: number },
): Record<string, string>[] {
  return Array.from({ length: count }, () => {
    const row: Record<string, string> = {}
    for (const key of keys) row[key] = mockValue(key, numberRange)
    return row
  })
}

/** 导出 CSV（带 BOM，Excel 打开中文不乱码） */
export function toCsv(rows: Record<string, string>[], labels: Record<string, string>): string {
  const keys = Object.keys(labels)
  const escape = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
  const lines = [keys.map((k) => escape(labels[k])).join(',')]
  for (const row of rows) lines.push(keys.map((k) => escape(row[k] ?? '')).join(','))
  return '\uFEFF' + lines.join('\r\n')
}
