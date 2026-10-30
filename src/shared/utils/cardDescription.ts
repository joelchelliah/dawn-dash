import {
  DexImageUrl,
  HealthImageUrl,
  HolyImageUrl,
  IntImageUrl,
  StrImageUrl,
} from '@/shared/utils/imageUrls'

export const parseCardDescription = (description: string, iconClassName?: string) => {
  const parsedDescription = description
    .replace(/<br\s*\/?>/g, '<br />') // Normalize <br> tags
    .replace(/\[\[/g, '[') // Replace [[ with [
    .replace(/\]\]/g, ']') // Replace ]] with ]
    .replace(/\(\[/g, '(') // Replace ([ with (
    .replace(/\(\{/g, '(') // Replace ({ with (
    .replace(/\]\)/g, ')') // Replace ]) with )
    .replace(/\}\)/g, ')') // Replace }) with )

  if (!iconClassName) {
    return parsedDescription.trim()
  }

  return parsedDescription
    .replaceAll('HEALTH', `<img class="${iconClassName}" src="${HealthImageUrl}" alt="HEALTH" />`)
    .replaceAll('HOLY', `<img class="${iconClassName}" src="${HolyImageUrl}" alt="HOLY" />`)
    .replaceAll('STR', `<img class="${iconClassName}" src="${StrImageUrl}" alt="STR" />`)
    .replaceAll('INT', `<img class="${iconClassName}" src="${IntImageUrl}" alt="INT" />`)
    .replaceAll('DEX', `<img class="${iconClassName}" src="${DexImageUrl}" alt="DEX" />`)
    .trim()
}
