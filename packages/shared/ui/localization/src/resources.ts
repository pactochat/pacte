import commonCat from './locales/cat/common.json' with { type: 'json' }
import commonEng from './locales/eng/common.json' with { type: 'json' }
import commonSpa from './locales/spa/common.json' with { type: 'json' }

export const resources = {
	cat: { common: commonCat },
	eng: { common: commonEng },
	spa: { common: commonSpa },
}
