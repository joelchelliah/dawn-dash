import { createCx } from '@/shared/utils/classnames'
import {
  AnimaImageUrl,
  BloodImageUrl,
  DexImageUrl,
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

const cx = createCx(styles)

const RARITY_BASE_POINTS = [
  { rarity: 'Common', points: 50 },
  { rarity: 'Uncommon', points: 75 },
  { rarity: 'Rare', points: 113 },
  { rarity: 'Legendary', points: 170 },
  { rarity: 'Monster', points: 50, note: '(scored as a common card)' },
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

const renderIcon = (name: string) => {
  const renderImage = (url: string) => (
    <Image className={cx('game-icon')} src={url} alt={name} height={16} width={16} />
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
    default:
      throw new Error(`Unknown icon: ${name}`)
  }
}

const KEYWORD_EXAMPLES = [
  {
    card: 'Holy War',
    reason: (
      <>
        ✅ &nbsp;Name contains: <Highlight mode={modeBlightbane}>holy</Highlight>.
      </>
    ),
  },
  {
    card: 'Battlecry',
    reason: (
      <>
        ✅ &nbsp;Description contains: <Highlight mode={modeBlightbane}>frenzy</Highlight>.
      </>
    ),
  },
  {
    card: 'Riptide',
    reason: (
      <>
        ✅ &nbsp;Description contains:{' '}
        <strong>
          di<Highlight mode={modeBlightbane}>scar</Highlight>d
        </strong>
        .
      </>
    ),
  },
  {
    card: 'Renew',
    reason: (
      <>
        ✅ &nbsp;Description contains: {renderIcon('HOLY')}, which is coded as{' '}
        <Highlight mode={modeBlightbane}>holy</Highlight>.
      </>
    ),
  },
  {
    card: 'Booty',
    reason: (
      <>
        ❌ &nbsp;Is an equipment type, but no <Highlight mode={modeBlightbane}>equipment</Highlight>{' '}
        in the card text.
      </>
    ),
  },
  {
    card: 'Revive',
    reason: (
      <>
        ❌ &nbsp;Has {renderIcon('HOLY')} energy cost, but no{' '}
        <Highlight mode={modeBlightbane}>holy</Highlight> or {renderIcon('HOLY')} in the card text.
      </>
    ),
  },
]

const ICON_KEYWORDS = [
  { icon: renderIcon('INT'), keyword: 'int' },
  { icon: renderIcon('STR'), keyword: 'str' },
  { icon: renderIcon('DEX'), keyword: 'dex' },
  { icon: renderIcon('HOLY'), keyword: 'holy' },
  { icon: renderIcon('NEUTRAL'), keyword: 'neutral' },
  { icon: '❤️', keyword: 'health' },
  {
    icon: (
      <>
        🫟 <small>(void energy icon)</small>
      </>
    ),
    keyword: 'void',
  },
  { icon: renderIcon('BLOOD'), keyword: 'blood' },
  {
    icon: (
      <>
        🪙 <small>(gold icon)</small>
      </>
    ),
    keyword: 'gold',
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

        <h3 className={cx('subheader')}>📝 Keywords bonus</h3>

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
              items={KEYWORD_EXAMPLES.map(({ card, reason }) => (
                <>
                  <strong>{card}</strong> - {reason}
                </>
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

        <ScoringList
          mode={mode}
          items={ICON_KEYWORDS.map(({ icon, keyword }) => (
            <>
              {icon} - <Code>{keyword}</Code>
            </>
          ))}
        />

        <ExampleBox emoji="🤪" mode={mode}>
          <p>
            The game uses html tags, like <Code>&lt;nobr&gt;</Code> and <Code>&lt;b&gt;</Code>, for
            formatting the card texts. These are invisible in the game, but they would still be
            scored if they were ever used as keywords in a <strong>Weekly Challenge!</strong>
          </p>
        </ExampleBox>

        <br />

        <br />

        <h4 className={cx('subsection-header')}>✨ Tiny icons still count</h4>

        <p>
          The keyword-matching rule also applies to the tiny icons you see in the card descriptions.
          These all have a corresponding text that will also give a bonus if they match one of the
          weekly keywords:
        </p>

        <ul className={cx('icon-keywords')}>
          {ICON_KEYWORDS.map(({ icon, keyword }) => (
            <li key={keyword}>
              {icon} - <Code>{keyword}</Code>
            </li>
          ))}
        </ul>

        <p>
          With that in mind, can you see why the card{' '}
          <GradientLink text="Radiant Burst" url="https://blightbane.io/card/Radiant_Burst" />{' '}
          matches the keyword <em>exi</em>?
        </p>

        <ExampleBox emoji="💡" mode={mode}>
          <p>
            <strong>Hint:</strong> It also matches <em>tst</em> and <em>rho</em> for the same reason
          </p>
          <p>
            <strong>Answer:</strong> There are no spaces between the icons in the description, so
            they read as: d<strong>exi</strong>ntstrholy
          </p>
        </ExampleBox>

        <br />

        <h4 className={cx('subsection-header')}>📈 Keyword bonus values and scaling</h4>

        <p>
          The <strong>first</strong> part of the objective says:
        </p>

        <ExampleBox emoji="💬" mode={mode}>
          <p>
            <em>&quot;+50 Points for cards that have...&quot;</em>
          </p>
        </ExampleBox>

        <p>
          This might be a bit outdated, because it&apos;s not <em>entirely</em> correct anymore. You
          actually only get 50 base points if it&apos;s a <strong>common card</strong>. For each
          rarity level you go up, you actually get 50% more base points than the previous one:
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
          The <strong>second</strong> part of the objective says:
        </p>

        <ExampleBox emoji="💬" mode={mode}>
          <p>
            <em>&quot;Half Points for additional copies after the first.&quot;</em>
          </p>
        </ExampleBox>

        <p>
          This actually means that for each additional copy, you get half as much as the previous
          copy. Not a <em>flat half</em> for all copies! So for 3 copies of the same{' '}
          <strong>legendary</strong> card, that matches a weekly keyword, you will get 170 + 85 + 43
          = <Highlight mode={mode}>298</Highlight> base points.
        </p>

        <p>
          Each keyword bonus is then multiplied by the malignancy modifier (and rounded up), before
          being summed together:
        </p>

        <div className={cx('formula')}>
          <Code>Total = ∑&#123;keyword bonus × (1 + malignancy modifier)&#125;</Code>
        </div>

        <ExampleBox emoji="ℹ️" mode={mode}>
          <p>
            <strong>Note:</strong> It&apos;s possible to have Weekly Challenges without the 50%
            reduction to duplicates, but it rarely happens.
          </p>
        </ExampleBox>

        <br />

        <h4 className={cx('subsection-header')}>👹 Very niche special rule (WTF?!)</h4>

        <p>
          There is one funny exception to the rule about keywords only being in the{' '}
          <strong>name</strong> or <strong>description</strong>. If the keyword fully matches a type
          of <strong>rarity</strong> (including the <em>capital first letter</em>), then all cards
          of that rarity will be counted as score cards for that week: <strong>Monster</strong>,{' '}
          <strong>Common</strong>, <strong>Uncommon</strong>, <strong>Rare</strong>, or{' '}
          <strong>Legendary</strong>.
        </p>

        <p>
          This doesn&apos;t happen very often anymore, but the rule still exists. Here&apos;s the
          latest one we had using <strong>Monster</strong> as a keyword:{' '}
          <GradientLink
            text="Challenge #1761815906348"
            url="https://blightbane.io/challenge/1761815906348"
          />
          .
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
