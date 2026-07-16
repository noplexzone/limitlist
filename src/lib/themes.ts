export interface ThemeDefinition {
  id: string
  name: string
  description: string
  vars: Record<string, string>
  swatches: string[]
}

export const DEFAULT_THEME_ID = 'gojo'

export const THEMES: ThemeDefinition[] = [
  {
    id: 'gojo',
    name: 'Gojo Satoru',
    description: 'Electric blue Six Eyes accents on deep black surfaces.',
    swatches: ['59 130 246', '14 165 233', '248 250 252'],
    vars: {
      '--color-accent-100': '219 234 254',
      '--color-accent-200': '191 219 254',
      '--color-accent-300': '147 197 253',
      '--color-accent-400': '96 165 250',
      '--color-accent-500': '59 130 246',
      '--color-accent-600': '37 99 235',
      '--color-accent-700': '29 78 216',
      '--color-accent-800': '30 64 175',
      '--color-accent-900': '30 58 138',
      '--color-accent-950': '23 37 84',
    },
  },
  {
    id: 'chainsaw-man',
    name: 'Chainsaw Man',
    description: 'Pochita orange and blood red against near-black.',
    swatches: ['249 115 22', '185 28 28', '10 10 10'],
    vars: {
      '--color-accent-100': '255 237 213',
      '--color-accent-200': '254 215 170',
      '--color-accent-300': '253 186 116',
      '--color-accent-400': '251 146 60',
      '--color-accent-500': '249 115 22',
      '--color-accent-600': '234 88 12',
      '--color-accent-700': '194 65 12',
      '--color-accent-800': '154 52 18',
      '--color-accent-900': '124 45 18',
      '--color-accent-950': '67 20 7',
    },
  },
  {
    id: 'nanami',
    name: 'Kento Nanami',
    description: 'Muted khaki and navy for a tailored, formal palette.',
    swatches: ['202 138 4', '30 41 59', '214 211 209'],
    vars: {
      '--color-accent-100': '254 249 195',
      '--color-accent-200': '254 240 138',
      '--color-accent-300': '253 224 71',
      '--color-accent-400': '250 204 21',
      '--color-accent-500': '234 179 8',
      '--color-accent-600': '202 138 4',
      '--color-accent-700': '161 98 7',
      '--color-accent-800': '133 77 14',
      '--color-accent-900': '113 63 18',
      '--color-accent-950': '66 32 6',
    },
  },
  {
    id: 'levi',
    name: 'Levi Ackerman',
    description: 'Survey Corps forest green and leather brown on charcoal.',
    swatches: ['22 101 52', '120 53 15', '39 39 42'],
    vars: {
      '--color-accent-100': '220 252 231',
      '--color-accent-200': '187 247 208',
      '--color-accent-300': '134 239 172',
      '--color-accent-400': '74 222 128',
      '--color-accent-500': '34 197 94',
      '--color-accent-600': '22 163 74',
      '--color-accent-700': '21 128 61',
      '--color-accent-800': '22 101 52',
      '--color-accent-900': '20 83 45',
      '--color-accent-950': '5 46 22',
    },
  },
]

export function isThemeId(value: string | null | undefined): value is string {
  return Boolean(value && THEMES.some((theme) => theme.id === value))
}

export function getThemeById(value: string | null | undefined): ThemeDefinition {
  return THEMES.find((theme) => theme.id === value) ?? THEMES[0]
}
