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
import Image from '@/shared/components/Image'

import { ScoringMode } from '@/scoring/types'

import CollapsiblePanel from '../CollapsiblePanel'
import Highlight from '../Highlight'
import ScoringList from '../ScoringList'
import ExampleBox from '../ExampleBox'
import ParameterInfoList from '../ParameterInfoList'
import IllustratedScoringInfo from '../IllustratedScoringInfo'
import SpoilerText from '../SpoilerText'
import CenteredImage from '../CenteredImage'

import styles from './index.module.scss'

const cx = createCx(styles)

const RARITY_BASE_POINTS = [
  { rarity: 'Common', points: 50 },
  { rarity: 'Uncommon', points: 75 },
  { rarity: 'Rare', points: 113 },
  { rarity: 'Legendary', points: 169 },
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
        <strong>X</strong> points for choosing the malignancy «<strong>Malignancy</strong>».
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

const renderIcon = (name: string, large = false) => {
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
      isLongTitle
    >
      <div className={cx('content')}>
        <p>
          Your <Highlight mode={mode}>Blightbane</Highlight> score consists of special{' '}
          <strong>Weekly-specific</strong> bonuses that are unique to each week&apos;s challenge.
          Some of these bonuses are improved by your <strong>malignancy level</strong>, while others
          just add a fixed score to your total. We&apos;ll cover each of these bonuses in detail
          below.
        </p>
        <h3 className={cx('header')}>🎖️ Fixed score bonuses</h3>
        <p>
          These bonuses are added to the total score as-is. They don&apos;t scale with your
          <strong>malignancies</strong>, but still tend to be quite generous score-wise (most of the
          time). Here&apos;s a list of all the <strong>fixed score bonuses</strong> you might
          encounter. Most challenges will contain at least two of these:
        </p>
        <IllustratedScoringInfo
          mode={mode}
          imageSrc={'/scoring/flat-score.webp'}
          imageAlt="Fixed Score Bonus Example"
        >
          <ParameterInfoList parameters={FLAT_SCORE_BONUSES} />
        </IllustratedScoringInfo>
        <p>
          You&apos;ll need to evaluate each of these on a <em>weekly-by-weekly</em> basis, and
          decide how high you want to prioritize them compared to all the other scoring objectives.
          Especially considering their fixed score values!
        </p>
        <h3 className={cx('header')}>🚀 Scalable score bonuses</h3>
        <p>
          These bonuses scale together with your <strong>malignancies</strong> (similarly to the{' '}
          <Highlight mode={ScoringMode.Standard}>Standard</Highlight> mode parameters):
        </p>
        <ScoringList
          mode={mode}
          items={[
            <>
              📝 <strong>Keywords</strong> bonus{' '}
              <span className={cx('list-item-description')}>Card tracking</span>
            </>,
            <>
              🎯 <strong>Accuracy</strong> bonus{' '}
              <span className={cx('list-item-description')}>Deck size management</span>
            </>,
          ]}
        />
        <p>
          The first one rewards you for finding cards matching specific words, while the second one
          rewards you for maintaining your deck size within a given range.
        </p>
        <h4 className={cx('subheader')}>📝 Keywords bonus</h4>
        <p>
          The <strong>keywords bonus</strong> scoring has a few different variants, but only one of
          them is used most of the time. We&apos;ll only be covering this default variant here, for
          now:
        </p>
        <IllustratedScoringInfo
          mode={mode}
          imageSrc={'/scoring/keyword-score.webp'}
          imageAlt="Keywords Bonus Example"
        >
          <div className={cx('illustrated-info')}>
            <p>
              Most challenges will give you a list of <strong>keywords</strong> to look out for. Any
              card in your final deck having one of these words in its <strong>name</strong> or{' '}
              <strong>description</strong> will award you bonus points. Any other part of the card
              (like the <em>card type</em>) will <strong>not</strong> count. Here are a few examples
              for the keywords in the image:
            </p>
            <br />

            <ScoringList
              mode={mode}
              items={KEYWORD_EXAMPLES.map(({ card, emoji, reason }) => (
                <span key={card.key} className={cx('keyword-example')}>
                  <span className={cx('keyword-example__card')}>{card}</span> -{' '}
                  <span className={cx('keyword-example__emoji')}>{emoji}</span>{' '}
                  <span className={cx('keyword-example__reason')}>{reason}</span>
                </span>
              ))}
            />
          </div>
        </IllustratedScoringInfo>
        <p>
          As you can see in the above example, this rule also applies to the tiny{' '}
          <strong>icons</strong> that may appear in the card text. Each icon has a corresponding
          internal code that will trigger the <strong>keywords bonus</strong> when matched:
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
        <p>
          A keyword anywhere in the <strong>name</strong> or <strong>description</strong>{' '}
          (uninterrupted by other characters) will score. It doesn&apos;t have to be an official
          in-game keyword, or even a real word... Just any string of characters. But matching
          multiple keywords on a single card does <strong>not</strong> stack the bonus.
        </p>
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
              <strong>Answer:</strong> There are no spaces between the icons in the description, so
              they read as: &quot;
              <strong>
                d<Highlight mode={mode}>exi</Highlight>ntstrholy
              </strong>
              &quot;.
            </SpoilerText>
          </p>
        </ExampleBox>
        <h5 className={cx('mini-header')}>📈 Keyword points scaling</h5>
        <p>
          In addition to scaling with your malignancies, this bonus also scales with the{' '}
          <strong>rarity</strong> of the matching card. The objective says:{' '}
          <Code>
            <Highlight mode={mode}>+50</Highlight> <strong>Points for cards that have...</strong>
          </Code>
          , meaning that you get a base score of <Highlight mode={mode}>50</Highlight> if it&apos;s
          a <strong>common card</strong>. For each rarity level above common, you get a{' '}
          <strong>50% higher</strong> base value than the one below it:
        </p>
        <ScoringList
          mode={mode}
          items={RARITY_BASE_POINTS.map(({ rarity, points, note }) => (
            <>
              <strong>{rarity}</strong> - <Highlight mode={mode}>{points}</Highlight>{' '}
              {note && <span className={cx('rarity-note')}>{note}</span>}
            </>
          ))}
        />
        <p>
          You should always prioritize the higher rarity ones when hunting down your keyword bonus
          cards. A <strong>legendary</strong> is worth over 3 times as much as a{' '}
          <strong>common</strong>, and will also scale a lot faster with your malignancies!
        </p>
        <p>
          The objective usually also states:
          <Code wrap="mobile">
            <strong>Half Points for additional copies after the first</strong>
          </Code>
          , meaning that you&apos;ll get a <strong>50%</strong> score reduction on each additional
          copy of a card you already have. For 3 copies of the same <strong>legendary</strong> card,
          that matches a weekly keyword, you will receive a base score of only{' '}
          <Highlight mode={mode}>298</Highlight> (<Code>170 + 85 + 43 = 298</Code>).
        </p>
        <ExampleBox emoji="🌀" mode={mode}>
          <p>
            For most weeks, the 50% score reduction only applies to the first 2 extra copies, giving
            no score at all for any duplicates beyond that. This is a flexible parameter, but it
            hardly ever changes.
          </p>
        </ExampleBox>
        <h5 className={cx('mini-header')}>🕵️‍♂️ Help tracking keywords</h5>
        <p>
          Some weeks the keywords can be trickier to spot than others. Especially if they&apos;re
          unusual words, or are hiding inside other words (and icons) like &quot;
          <strong>
            di<Highlight mode={mode}>SCAR</Highlight>d
          </strong>
          &quot;, &quot;
          <strong>
            ingre<Highlight mode={mode}>DIE</Highlight>nt
          </strong>
          &quot; or &quot;
          <strong>
            <Highlight mode={mode}>HEAL</Highlight>th
          </strong>
          &quot; ({renderIcon('HEALTH')}).
        </p>
        <p>
          The <GradientLink text="Dawn-Dash: Cardex" url="https://dawn-dash.com/cardex" /> tool was
          created with the{' '}
          <Highlight mode={ScoringMode.WeeklyChallenge}>Weekly Challenges</Highlight> in mind. It{' '}
          will help you find all cards matching a given list of keywords.
        </p>

        <CenteredImage
          src="/landing-cardex.webp"
          alt="Dawn-dash: Cardex"
          width={800}
          height={420}
          href="/cardex"
        />

        <p>
          The <strong>Cardex</strong> follows the exact same criteria for matching keywords as the{' '}
          <Highlight mode={mode}>Blightbane</Highlight> scorer. It has several filters and options
          to help refine your search, or you can hit the big{' '}
          <strong>Optimize for Weekly Challenge</strong> button to get a list of all cards matching
          the current challenge&apos;s keywords!
        </p>

        <h5 className={cx('mini-header')}>🫠 Exact rarity-matching keywords</h5>
        <p>
          There is one funny exception to the keywords-matching rule. If the keyword fully matches a
          type of <strong>rarity</strong> (including the <em>capital first letter</em>), then all
          cards of that rarity will be counted as score cards for that week:{' '}
          <strong>Monster</strong>, <strong>Common</strong>, <strong>Uncommon</strong>,{' '}
          <strong>Rare</strong>, or <strong>Legendary</strong>.
        </p>
        <p>
          This doesn&apos;t happen very often anymore, but the rule still exists. Here&apos;s one we
          had with &quot;<strong>Monster</strong>&quot; as a keyword:{' '}
          <GradientLink text="Monster Mash" url="https://blightbane.io/challenge/1761815906348" />.
          As you can see from the submissions, all <strong>Monster rarity</strong> cards were
          counted as score cards for that week.
        </p>
        <h4 className={cx('subheader')}>🎯 Accuracy bonus</h4>
        <p>
          More like <strong>Inaccuracy Penalty</strong>... This one will heavily penalize you for
          having too many or too few cards in your deck, if you&apos;re not careful!
        </p>
        <IllustratedScoringInfo
          mode={mode}
          imageSrc={'/scoring/accuracy-score.webp'}
          imageAlt="Accuracy Bonus Example"
        >
          <div className={cx('illustrated-info')}>
            <p>
              You start off with a base score (usually <Highlight mode={mode}>3000</Highlight>), and
              the further you stray from the accuracy goal, you are deducted <strong>10%</strong> (
              <Highlight mode={mode}>300</Highlight>) for each time you pass a hidden{' '}
              <strong>buffer</strong> value.
            </p>
            <p>
              From the accuracy window in this example (<strong>17 - 23</strong>), we can derive our
              two hidden values:
            </p>
            <br />

            <ScoringList
              mode={mode}
              items={[
                <>
                  The <strong>target</strong>: <Highlight mode={mode}>20</Highlight>{' '}
                  <span className={cx('list-item-description')}>The real accuracy value</span>
                </>,
                <>
                  The <strong>buffer</strong>: <Highlight mode={mode}>4</Highlight>{' '}
                  <span className={cx('list-item-description')}>
                    The number of cards until your next penalty
                  </span>
                </>,
              ]}
            />

            <br />

            <p>
              The <strong>target</strong> is always the <em>middle number</em> in the given accuracy
              window, which is <Highlight mode={mode}>20</Highlight> in this example. The{' '}
              <strong>buffer</strong> might feel less intuitive, but you find it by counting the
              steps from the <strong>target</strong> to either edge of the accuracy range (including
              the target). This gives us:{' '}
              <Code>
                17 {'->'} 18 {'->'} 19 {'->'} 20 .... = <Highlight mode={mode}>4</Highlight>
              </Code>{' '}
              or{' '}
              <Code>
                20 {'->'} 21 {'->'} 22 {'->'} 23 .... = <Highlight mode={mode}>4</Highlight>
              </Code>
              .
            </p>
          </div>
        </IllustratedScoringInfo>
        <p>
          In the example above, if you end your run with <Highlight mode={mode}>24 - 27</Highlight>{' '}
          cards in your deck, you&apos;ve passed the <strong>buffer</strong> once and will be
          penalized <strong>10%</strong> (<Highlight mode={mode}>300</Highlight>), leaving you with
          a base accuracy score of <Highlight mode={mode}>2700</Highlight>. Ending your run with a{' '}
          <Highlight mode={mode}>28 - 31</Highlight> cards deck, you&apos;ve passed the buffer
          twice, and are penalized by <strong>20%</strong> (<Highlight mode={mode}>600</Highlight>).
          Passing it a third time drops you down to <Highlight mode={mode}>2100</Highlight>, and so{' '}
          on...
        </p>
        <ExampleBox emoji="☠️" mode={mode}>
          <p>
            The penalty doesn&apos;t stop when you reach <Highlight mode={mode}>0</Highlight>.
            Passing the <strong>buffer</strong> more than ten times will bring you into the{' '}
            <strong>negative</strong> territory. Unless negative scoring is{' '}
            <strong>disabled</strong> for the specific challenge, which rarely happens.
          </p>
        </ExampleBox>
        <p>
          Why does knowing the <strong>buffer</strong> matter? If you&apos;ve already accrued a
          penalty by passing the buffer, then you can fill up the remaining buffer quota with{' '}
          <strong>keyword bonus</strong> cards to help minimize this penalty. Or maybe even put you
          at a <strong>net positive</strong>! Which leads us to...
        </p>
        <h5 className={cx('mini-header')}>🔨 Breaking the accuracy window!</h5>
        <p>
          There is a strategic element to breaking past the <strong>accuracy window</strong> and
          still coming out ahead, and it all depends on how high the <strong>buffer</strong> value
          is. The higher the <strong>buffer</strong>, the more cards you can pick up before hitting
          your next penalty, and thereby collecting enough <strong>keyword bonus</strong> cards to
          offset it!
        </p>
        <p>
          Sticking to the previous example with an accuracy bonus of{' '}
          <Highlight mode={mode}>3000</Highlight> and a buffer of{' '}
          <Highlight mode={mode}>4</Highlight>, you lose <Highlight mode={mode}>300</Highlight>{' '}
          points for every fourth card (after breaking the window). Picking up 4 distinct{' '}
          <strong>uncommon</strong> cards give you a base of <Highlight mode={mode}>300</Highlight>{' '}
          (<Code>4 × 75</Code>) points, which already cancels out this penalty. Any combination of 4{' '}
          <strong>higher rarity</strong> cards will put you ahead. You could theoretically keep
          going like this for as long as you find the right cards, and even finish a run with a{' '}
          <strong>negative accuracy bonus</strong> but still come out with a net positive gain.
        </p>
        <ExampleBox emoji="🧐" mode={mode}>
          <p>
            Is it still ok to break the window when the buffer is a strict{' '}
            <Highlight mode={mode}>2</Highlight>?
          </p>
          <p>
            <strong>Hint:</strong> Every distinct <strong>legendary</strong> keyword match gives you{' '}
            <Highlight mode={mode}>170</Highlight> base score.
          </p>
          <p>
            <SpoilerText mode={mode} label="Show answer">
              <strong>Answer:</strong> In theory, yes... But quite difficult to achieve, as you will
              need to find 2 distinct <strong>legendaries</strong> per break. High risk of
              sabotaging your score, if you don&apos;t find them!
            </SpoilerText>
          </p>
        </ExampleBox>
        <p>
          In addition, collecting more cards also contributes to increasing the ranks of the{' '}
          <Highlight mode={ScoringMode.Standard}>Standard</Highlight> mode parameters:{' '}
          <strong>Versatility</strong> and <strong>Wealth</strong>. Depending on the{' '}
          <strong>rank</strong>, this boost may or may not cover an entire penalty, but it
          definitely helps.
        </p>
        <h3 className={cx('header')}>🧮 Total Blightbane Score</h3>
        <p>
          Finally, the <Highlight mode={mode}>Blightbane</Highlight> score is calculated by adding
          together the <strong>fixed score bonus</strong>, the <strong>keywords bonus</strong> and
          the <strong>accuracy bonus</strong>. The last two components are improved by the{' '}
          <strong>malignancy</strong> modifier:{' '}
          <Code wrap="mobile">
            Fixed bonus + (Keywords bonus + Accuracy bonus) × (1 + Malignancy level)
          </Code>
        </p>
        <p>
          This value, also shown in <Highlight mode={mode}>green</Highlight> on your submission
          page, is combined with your <Highlight mode={ScoringMode.Standard}>Standard</Highlight>{' '}
          mode score to give you your total{' '}
          <Highlight mode={ScoringMode.WeeklyChallenge}>Weekly Challenge</Highlight> score.
        </p>
        <p>
          ⚠️ Note that the <Highlight mode={mode}>Blightbane</Highlight> scoring mode only considers
          cards in your <strong>main decklist</strong>! Cards found anywhere else will be{' '}
          <strong>ignored</strong> by all score bonus components. This includes:
        </p>
        <ScoringList
          mode={mode}
          items={[
            <>
              <strong>Imbued</strong> cards.
            </>,
            <>
              Cards in your <strong>Companion deck</strong>.
            </>,
            <>
              Cards in your <strong>Scrap deck</strong>.
            </>,
          ]}
        />
        <p>If you cannot see it in your deck outside of combat, it will not count.</p>
      </div>
    </CollapsiblePanel>
  )
}

export default BlightbaneScorePanel
