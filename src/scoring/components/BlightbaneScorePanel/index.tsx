import { createCx } from '@/shared/utils/classnames'
import {
  AnimaImageUrl,
  BloodImageUrl,
  DexImageUrl,
  HealthImageUrl,
  HolyImageUrl,
  IntImageUrl,
  NeutralImageUrl,
  StrImageUrl,
} from '@/shared/utils/imageUrls'
import GradientLink from '@/shared/components/GradientLink'
import Code from '@/shared/components/Code'

import { ScoringMode } from '@/scoring/types'

import CollapsiblePanel from '../CollapsiblePanel'
import Highlight from '../Highlight'
import ScoringList from '../ScoringList'
import ExampleBox from '../ExampleBox'

import styles from './index.module.scss'
import ParameterInfoList from '../ParameterInfoList'
import IllustratedScoringInfo from '../IllustratedScoringInfo'
import Image from '@/shared/components/Image'
import SpoilerText from '../SpoilerText'

const cx = createCx(styles)

const RARITY_BASE_POINTS = [
  { rarity: 'Common', points: 50 },
  { rarity: 'Uncommon', points: 75 },
  { rarity: 'Rare', points: 113 },
  { rarity: 'Legendary', points: 170 },
  { rarity: 'Monster', points: 50, note: '(scored as a common, but is actually a lower rarity)' },
]

const modeBlightbane = ScoringMode.Blightbane

const FLAT_SCORE_BONUSES = [
  {
    label: 'Deck Contains Card',
    emoji: '🃏',
    description: (
      <>
        <strong>X</strong> points for having a card «<strong>A</strong>
        ».
      </>
    ),
  },
  {
    label: 'Points Per Card',
    emoji: '🗂️',
    description: (
      <>
        <strong>X</strong> points each for having cards «<strong>A</strong>», «<strong>B</strong>»,
        or «<strong>C</strong>» (up to a max of <strong>Y</strong> points each).
      </>
    ),
  },
  {
    label: 'Points Per Upgrade',
    emoji: '🛠️',
    description: (
      <>
        <strong>X</strong> points for each Upgrade on cards «<strong>A</strong>», «
        <strong>B</strong>», or «<strong>C</strong>» (up to a max of <strong>Y</strong> points
        each).
      </>
    ),
  },
  {
    label: 'Defeat Specific Boss',
    emoji: '👺',
    description: (
      <>
        <strong>X</strong> points for defeating «<strong>Boss</strong>».
      </>
    ),
  },
  {
    label: 'Specific Malignancy',
    emoji: '🦠',
    description: (
      <>
        <strong>X</strong> points for choosing the Malignancy «<strong>Malignancy</strong>».
      </>
    ),
  },
  {
    label: 'Victory',
    emoji: '🏆',
    description: (
      <>
        <strong>X</strong> points for <strong>completing the final encounter</strong>.
      </>
    ),
  },
]

const renderIcon = (name: string, large: boolean = false) => {
  const size = large ? 28 : 16
  const renderImage = (url: string) => (
    <Image className={cx('game-icon')} src={url} alt={name} height={size} width={size} />
  )

  switch (name) {
    case 'INT':
      return renderImage(IntImageUrl)
    case 'STR':
      return renderImage(StrImageUrl)
    case 'DEX':
      return renderImage(DexImageUrl)
    case 'HOLY':
      return renderImage(HolyImageUrl)
    case 'NEUTRAL':
      return renderImage(NeutralImageUrl)
    case 'BLOOD':
      return renderImage(BloodImageUrl)
    case 'HEALTH':
      return renderImage(HealthImageUrl)
    default:
      throw new Error(`Unknown icon: ${name}`)
  }
}

const KEYWORD_EXAMPLES = [
  {
    card: <GradientLink text="Holy War" url="https://blightbane.io/card/Holy_War" />,
    emoji: '✅',
    reason: (
      <>
        Name contains: <Highlight mode={modeBlightbane}>holy</Highlight>.
      </>
    ),
  },
  {
    card: <GradientLink text="Battlecry" url="https://blightbane.io/card/Battlecry" />,
    emoji: '✅',
    reason: (
      <>
        Description contains: <Highlight mode={modeBlightbane}>frenzy</Highlight>.
      </>
    ),
  },
  {
    card: <GradientLink text="Riptide" url="https://blightbane.io/card/Riptide" />,
    emoji: '✅',
    reason: (
      <>
        Description contains:{' '}
        <strong>
          di<Highlight mode={modeBlightbane}>scar</Highlight>d
        </strong>
        .
      </>
    ),
  },
  {
    card: <GradientLink text="Renew" url="https://blightbane.io/card/Renew" />,
    emoji: '✅',
    reason: (
      <>
        Description contains: {renderIcon('HOLY')}, which is coded as{' '}
        <Highlight mode={modeBlightbane}>holy</Highlight>.
      </>
    ),
  },
  {
    card: <GradientLink text="Booty" url="https://blightbane.io/card/Booty" />,
    emoji: '❌',
    reason: (
      <>
        Is an equipment type, but no <Highlight mode={modeBlightbane}>equipment</Highlight> in the
        card text.
      </>
    ),
  },
  {
    card: <GradientLink text="Revive" url="https://blightbane.io/card/Revive" />,
    emoji: '❌',
    reason: (
      <>
        Has {renderIcon('HOLY')} energy cost, but no{' '}
        <Highlight mode={modeBlightbane}>holy</Highlight> or {renderIcon('HOLY')} in the card text.
      </>
    ),
  },
]

const ICON_KEYWORDS = [
  { icon: renderIcon('INT', true), keyword: 'int', description: 'blue energy' },
  { icon: renderIcon('STR', true), keyword: 'str', description: 'red energy' },
  { icon: renderIcon('DEX', true), keyword: 'dex', description: 'green energy' },
  { icon: renderIcon('HOLY', true), keyword: 'holy', description: 'gold energy' },
  { icon: renderIcon('NEUTRAL', true), keyword: 'neutral', description: 'neutral energy' },
  { icon: renderIcon('HEALTH', true), keyword: 'health', description: 'health' },
  {
    icon: <span style={{ fontSize: '1.75rem' }}>🫟</span>,
    keyword: 'void',
    description: 'void energy',
  },
  { icon: renderIcon('BLOOD', true), keyword: 'blood', description: 'blood energy' },
  {
    icon: <span style={{ fontSize: '1.75rem' }}>🪙</span>,
    keyword: 'gold',
    description: 'gold',
  },
]

function BlightbaneScorePanel(): JSX.Element {
  const mode = ScoringMode.Blightbane

  return (
    <CollapsiblePanel
      title={'Blightbane Score'}
      imageUrl={AnimaImageUrl}
      mode={mode}
      collapsible
      defaultExpanded
      isLongTitle
    >
      <div className={cx('content')}>
        <p>
          Your <Highlight mode={mode}>Blightbane</Highlight> score consists of special{' '}
          <strong>Weekly-specific</strong> bonuses that are unique to each week&apos;s challenge.
          Some of these bonuses are improved by your <strong>Malignancy percentage</strong>, while
          others just add a flat score to your total. We&apos;ll cover each of these bonuses in
          detail below.
        </p>

        <p>
          🚚 TODO: MOVE THIS TO THE BOTTOM?
          <br />
          Note that this scoring mode only considers cards in your <strong>main decklist</strong>!
          Cards found anywhere else will be ignored for the purpose of <strong>any</strong>{' '}
          card-based scoring. This includes: TODO LIST!
        </p>

        <h3 className={cx('header')}>🎖️ Fixed score bonuses</h3>
        <p>
          These bonuses are added to the total score as-is. Keep in mind that they don&apos;t scale
          with your malignancies, but still tend to be quite generous score-wise (most of the time).
          Here&apos;s a list of all the <strong>fixed score bonuses</strong> you might encounter.
          Most challenges will contain at least two of these:
        </p>

        <IllustratedScoringInfo
          mode={mode}
          imageSrc={'/scoring/flat-score.webp'}
          imageAlt="In-Game Score Example"
        >
          <ParameterInfoList parameters={FLAT_SCORE_BONUSES} />
        </IllustratedScoringInfo>

        <p>
          You&apos;ll need to evaluate each of these on a <em>weekly-by-weekly</em> basis, and
          decide how high you want to prioritize them compared to all the other scoring objectives.
          Especially considering their flat score values!
        </p>

        <h3 className={cx('header')}>🚀 Scalable score bonuses</h3>
        <p>
          These bonuses scale together with your <strong>Malignancy percentage</strong> (similarly
          to the <Highlight mode={ScoringMode.Standard}>Standard</Highlight> mode parameters):
        </p>
        <ScoringList
          mode={mode}
          items={[
            <>
              📝 <strong>Keywords</strong> bonus - <em>Card tracking</em>
            </>,
            <>
              🎯 <strong>Accuracy</strong> bonus - <em>Deck size management</em>
            </>,
          ]}
        />

        <p>
          The first one focuses on tracking down cards matching specific words, while the second one
          rewards you for maintaining your deck size within a given range.
        </p>

        <h4 className={cx('subheader')}>📝 Keywords bonus</h4>

        <p>
          There are three different sets of scoring rules for the <strong>keywords bonus</strong>,
          but two of them are hardly ever used. We'll only be covering the default variant here:
        </p>

        <IllustratedScoringInfo
          mode={mode}
          imageSrc={'/scoring/keyword-score.webp'}
          imageAlt="In-Game Score Example"
        >
          <div className={cx('keywords-info')}>
            <p>
              Most challenges will give you a list of <strong>keywords</strong> to look out for. Any
              card in your final deck having one of these words in its <strong>name</strong> or{' '}
              <strong>description</strong> will award you bonus points, scaled by your malignancy.
              Any other part of the card (like the <em>card type</em>) will <strong>not</strong>{' '}
              count. Here are a few examples for the list in the image:
            </p>
            <br />

            <ScoringList
              mode={mode}
              items={KEYWORD_EXAMPLES.map(({ card, emoji, reason }) => (
                <span className={cx('keyword-example')}>
                  <span className={cx('keyword-example__card')}>{card}</span> -{' '}
                  <span className={cx('keyword-example__emoji')}>{emoji}</span>{' '}
                  <span className={cx('keyword-example__reason')}>{reason}</span>
                </span>
              ))}
            />
          </div>
        </IllustratedScoringInfo>

        <p>
          As you can see, these aren&apos;t always obvious at first glance! A keyword anywhere in
          the <strong>name</strong> or <strong>description</strong> (uninterrupted by other
          characters) is enough. But matching multiple keywords on a single card does{' '}
          <strong>not</strong> stack the keyword bonus.
        </p>

        <p>
          This rule also applies to the icons you see in the card descriptions. These all have a
          corresponding text that will trigger the keywords bonus if they match:
        </p>

        <div className={cx('icon-keywords-grid')}>
          {ICON_KEYWORDS.map(({ icon, keyword, description }) => (
            <div key={keyword} className={cx('icon-keywords-grid__item')}>
              <span className={cx('icon-keywords-grid__icon')}>{icon}</span>
              {description && (
                <span className={cx('icon-keywords-grid__description')}>{description}</span>
              )}
              - <Highlight mode={mode}>{keyword}</Highlight>
            </div>
          ))}
        </div>

        <ExampleBox emoji="🔍" mode={mode}>
          <p>
            Can you see why the card{' '}
            <GradientLink text="Radiant Burst" url="https://blightbane.io/card/Radiant_Burst" />{' '}
            matches the keyword <Code>exi</Code>?
          </p>
          <p>
            <strong>Hint:</strong> It also matches <Code>tst</Code> and <Code>rho</Code> for the
            same reason.
          </p>
          <p>
            <SpoilerText mode={mode} label="Show answer">
              There are no spaces between the icons in the description, so they read as: &quot;
              <strong>
                d<Highlight mode={mode}>exi</Highlight>ntstrholy
              </strong>
              &quot;.
            </SpoilerText>
          </p>
        </ExampleBox>

        <h5 className={cx('mini-header')}>📈 Keyword points scaling</h5>

        <p>
          In addition to scaling with your malignancy, they also scale with the{' '}
          <strong>rarity</strong> of the matching card. When the objective says:
          <Code>
            <Highlight mode={mode}>+50</Highlight> <strong>Points for cards that have...</strong>
          </Code>
          , it actually means that you get a base score of <Highlight mode={mode}>50</Highlight> if
          it&apos;s a <strong>common card</strong>. For each rarity level above common, you get a{' '}
          <strong>50% higher</strong> base value than the previous one:
        </p>

        <ScoringList
          mode={mode}
          items={RARITY_BASE_POINTS.map(({ rarity, points, note }) => (
            <>
              <strong>{rarity}</strong> - <Highlight mode={mode}>{points}</Highlight>{' '}
              {note && <span className={cx('note')}>{note}</span>}
            </>
          ))}
        />

        <p>
          As you can see, you should always prioritize the higher rarity ones when hunting down your
          keyword bonus cards. A <strong>legendary</strong> is worth over 3 times as much as a{' '}
          <strong>common</strong>, and will also scale a lot faster with your malignancies!
        </p>
        <p>
          The <strong>keywords bonus</strong> objective usually also includes:
          <Code>
            <strong>Half Points for additional copies after the first</strong>
          </Code>
          . This means that you will get diminishing returns for each additional copy, and{' '}
          <strong>not</strong> a flat half for all extra copies. For 3 copies of the same{' '}
          <strong>legendary</strong> card, that matches a weekly keyword, you will receive a base
          score of <Highlight mode={mode}>298</Highlight> (<Code>170 + 85 + 43 = 298</Code>) base
          points.
        </p>

        <ExampleBox emoji="🌀" mode={mode}>
          <p>
            For most weeks, the 50% score reduction only applies to the first 2 extra copies, giving
            no score at all for ones beyond. This is a flexible parameter, but it hardly ever
            changes.
          </p>
        </ExampleBox>

        <h5 className={cx('mini-header')}>🫠 A very weird exception</h5>

        <p>
          There is one funny exception to the rule about keywords only being in the{' '}
          <strong>name</strong> or <strong>description</strong>... If the keyword fully matches a
          type of <strong>rarity</strong> (including the <em>capital first letter</em>), then all
          cards of that rarity will be counted as score cards for that week:{' '}
          <strong>Monster</strong>, <strong>Common</strong>, <strong>Uncommon</strong>,{' '}
          <strong>Rare</strong>, or <strong>Legendary</strong>.
        </p>

        <p>
          This doesn&apos;t happen very often anymore, but the rule still exists. Here&apos;s the
          latest one we had with &quot;<strong>Monster</strong>&quot; as a keyword:{' '}
          <GradientLink text="Monster Mash" url="https://blightbane.io/challenge/1761815906348" />.
          As you can see from the submissions, all <strong>Monster rarity</strong> cards were
          counted as score cards for that week.
        </p>

        <br />

        <h3 className={cx('section-header')}>🔍 Accuracy bonus</h3>

        <p>An accuracy bonus objective might look like this:</p>

        <ExampleBox emoji="💬" mode={mode}>
          <p>
            <em>
              &quot;+3000 Points for having a deck between 18 and 24 cards. Having more or less than
              this target in your deck will reduce this bonus.&quot;
            </em>
          </p>
        </ExampleBox>

        <p>
          This means that the run is starting you off at 3000 base points. But the further you stray
          from the accuracy goal, you are deducted 10% of the base bonus for each increment of a
          hidden <strong>buffer</strong> value.
        </p>

        <p>
          From the above accuracy window (<strong>[18-24]</strong>), we can derive 2 values:
        </p>

        <ScoringList
          mode={mode}
          items={[
            <>
              The <strong>target</strong>: <Highlight mode={mode}>21</Highlight> -{' '}
              <em>The real accuracy value</em>
            </>,
            <>
              The <strong>buffer</strong>: <Highlight mode={mode}>4</Highlight> -{' '}
              <em>How many cards can you pick up before your next 10% penalty</em>
            </>,
          ]}
        />

        <p>
          Each week, you can find the <strong>target</strong> by finding the <em>middle number</em>{' '}
          in the given accuracy window. So in this example it&apos;s <strong>21</strong>. Finding
          the <strong>buffer</strong> might feel less intuitive, but you get it by counting from the
          target to either edge of the accuracy range, including the target in your count (so 21{' '}
          {'->'} 22 {'->'} 23 {'->'} 24 .... = <strong>4</strong>).
        </p>

        <p>
          This means that if you end your run with 25 cards, you have passed the{' '}
          <strong>buffer</strong> once, and will be penalized <em>10%</em> (300 points). Leaving you
          with a base accuracy score of <Highlight mode={mode}>2700</Highlight>. However, if you end
          your run with 28 cards, you have still only passed the buffer once, meaning you get the
          same penalty!
        </p>

        <p>
          Why does this matter? Well, what if those 3 extra cards you picked up from 25 to 28 were
          keyword bonus cards that helped minimize this penalty... or maybe even put you at a{' '}
          <strong>net positive</strong>?!
        </p>

        <p>Which leads us to...</p>

        <br />

        <h4 className={cx('subsection-header')}>✨ Breaking the accuracy window!</h4>

        <ExampleBox emoji="⚠️" mode={mode}>
          <p>
            <strong>Warning:</strong> This is a lot easier to achieve some weeks than others... Some
            weeks it might be near impossible.
          </p>
        </ExampleBox>

        <p>
          As seen from the example above, it all depends on how high the <strong>buffer</strong>{' '}
          value is. The higher the buffer, the more cards you can pick up before hitting a penalty,
          and therefore collect enough <em>keyword bonus</em> cards to offset/nullify each
          occurrence of the penalty.
        </p>

        <p>
          With an accuracy bonus of 3000 and a buffer of 4, you lose 300 points for every 4th card
          (starting from the first one breaking the window). This means that picking up 4 distinct{' '}
          <strong>uncommon</strong> cards already cancels out this penalty (<Code>4 × 75</Code>).
          And any combination of 4 higher rarity cards will actually <strong>put you ahead</strong>{' '}
          in total. You could theoretically keep going like this for as long as you find the right
          cards... and you can even finish a run with a <strong>negative accuracy bonus</strong> and
          still come out ahead overall!
        </p>

        <ExampleBox emoji="❓" mode={mode}>
          <p>
            <strong>Question:</strong> What if the buffer is a strict 2? Then you lose 300 points
            for every second card you pick up over the range. Is it still wise to break the window?
          </p>
          <p>
            <strong>Hint:</strong> Every distinct <strong>legendary</strong> keyword match gives you
            170 points.
          </p>
          <p>
            <strong>Answer:</strong> In theory, yes... But those 2 additional cards you pick up
            cannot be any lower than 2 distinct <strong>legendaries</strong>! Quite hard to achieve.
          </p>
        </ExampleBox>

        <p>
          In addition to all this, collecting more cards also has a chance of increasing the ranks
          of 2 of the in-game scoring parameters: <strong>Versatility</strong> and{' '}
          <strong>Wealth</strong>. Which also gives you a nice little boost.
        </p>

        <p>
          In the end, regardless of the buffer value, you have to decide if it&apos;s worth going
          for, depending on your current state in the game. There&apos;s always a risk of sabotaging
          your score!
        </p>

        <p>
          Your final accuracy bonus, whether it&apos;s a positive number or a negative number, will
          get multiplied by the malignancy modifier.
        </p>
      </div>
    </CollapsiblePanel>
  )
}

export default BlightbaneScorePanel
