import type { SupportStatement } from '@mdn/browser-compat-data'

export const finalFeatureVersion = (compat: SupportStatement): string => {
	if (Array.isArray(compat)) {
		return compat.find((el) => !el.flags)?.version_added as string
	}
	return compat.version_added as string
}
