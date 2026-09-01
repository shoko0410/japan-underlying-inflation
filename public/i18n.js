/* Every user-visible string on the page, in both languages.
 *
 * `doc` and `html` fill the static shell — index.html carries the Korean inline so the
 * page still reads without JavaScript, and these overwrite it when another language is
 * selected. `ui` is everything app.js draws. Nothing in app.js is hardcoded in one
 * language.
 *
 * Values under `html` are authored here and inserted as innerHTML so the prose can keep
 * its emphasis. Nothing from the data files goes through them — data-derived text is set
 * with textContent everywhere in app.js.
 *
 * Indicator names follow each language's own convention: the Bank of Japan's series have
 * established Japanese names (刈込平均値 and the rest), and Korean has ordinary words for
 * the same statistics, so neither side is transliterating the other.
 */
window.I18N = {

  // ──────────────────────────────────────────────────────────────── 한국어
  ko: {
    label: '한국어',
    htmlLang: 'ko',
    locale: 'ko-KR',
    month: (y, m) => `${y}년 ${Number(m)}월`,
    monthShort: (m) => m.replace('-', '.'),

    doc: {
      title: '일본 기조적 물가 — 절사평균·가중중앙값·최빈값',
      desc: '일본은행이 매달 내는 기조적 인플레 지표 모음. 절사평균·가중중앙값·최빈값과 상승·하락 품목 비율을 2001년부터 봅니다. 일본의 "코어"는 생선식품만 뺀 것이라 미국 Core와 다릅니다.',
    },

    html: {
      h1: '일본 기조적 물가',
      subtitle:
        '일본은행 조사통계국이 매달 내는 <strong>기조적 인플레 지표</strong>입니다. ' +
        '헤드라인에서 항목을 빼는 대신, 그 달 <strong>품목별 가격 변화의 분포를 통계로 요약</strong>합니다 — ' +
        '<strong>절사평균</strong>은 양끝을 잘라낸 평균, <strong>가중중앙값</strong>은 한가운데 품목, ' +
        '<strong>최빈값</strong>은 가장 흔한 변화율입니다. ' +
        '분포에서 읽는 지표라 특정 품목의 급등락에 잘 흔들리지 않습니다.',
      heroLabel: '절사평균 · 전년 대비',
      filterLabel: '기간',

      yoyTitle: '기조적 물가 — 전년 대비 (YoY)',
      yoySub:
        '앞의 셋은 <strong>가격 변화의 분포에서 읽는</strong> 지표이고, 뒤의 셋은 ' +
        '<strong>바구니에서 항목을 빼는</strong> 방식입니다. 기본은 분포 지표 셋 + 일본 코어가 ' +
        '켜져 있고, 범례를 눌러 나머지를 켤 수 있습니다. 세로 회색 띠는 내각부가 사후에 확정한 ' +
        '경기후퇴 구간, 가로 기준선은 일본은행 목표 2%입니다.',

      breadthTitle: '가격이 오른 품목은 얼마나 되나',
      breadthSub:
        '전년 대비 가격이 <strong>오른 품목</strong>과 <strong>내린 품목</strong>의 비율입니다. ' +
        '물가 상승이 몇몇 품목에 몰려 있는지 전방위로 퍼져 있는지를 보여줍니다 — 절사평균이 낮아도 ' +
        '상승 품목 비율이 높으면 압력이 넓게 남아 있다는 뜻입니다. ' +
        '두 선의 <strong>간격이 곧 확산지수(상승－하락)</strong>라서 따로 그리지 않았습니다. ' +
        '단위가 %포인트로 달라 같은 축에 얹으면 오해를 부르기도 하고요. 값은 타일과 표에 있습니다.',

      tableTitle: '데이터 테이블',
      tableSub: '차트의 모든 값을 숫자로 확인할 수 있습니다. 최근 데이터가 위쪽입니다.',

      notesTitle: '읽을 때 주의할 점',
      noteSpecial:
        '<strong>이 숫자들은 뉴스에 나오는 공식 CPI와 다릅니다.</strong> 일본은행이 ' +
        '<strong>"특수요인"을 제거한 자체 추계치</strong>이기 때문입니다. 소비세율 변경, 교육 무상화 ' +
        '(2026년 4월 급식 무상화 포함), 2021년 휴대폰 요금 인하, 여행 지원 사업, 전기·가스·휘발유 ' +
        '부담 경감책이 여기에 해당합니다. 정책이 만든 일회성 단차를 걷어내야 시계열이 비교 가능해지기 ' +
        '때문인데, 그만큼 총무성이 발표하는 공식 숫자와는 어긋납니다. ' +
        '<strong>차이가 얼마나 되는지는 직접 보실 수 있습니다</strong> — 범례에서 "(공식)"이 붙은 ' +
        '세 계열을 켜면 총무성 발표치가 함께 그려집니다. 2026년 7월 기준 공식 코어는 1.8%인데 ' +
        '특수요인을 제거한 일본은행 값은 2.3%입니다. 전기·가스·휘발유 부담 경감책이 공식 수치를 ' +
        '0.5%p가량 눌러 놓고 있다는 뜻입니다. 무엇을 특수요인으로 볼지도 바뀔 수 있습니다.',
      noteCore:
        '<strong>일본의 "코어"는 미국 Core와 다릅니다.</strong> 일본에서 「코어CPI」는 ' +
        '<strong>생선식품만</strong> 제외한 지수라 <strong>에너지가 그대로 들어 있습니다</strong>. ' +
        '미국식 Core(식료품·에너지 제외)에 해당하는 건 한 겹 더 뺀 「<strong>코어코어</strong>」이고, ' +
        '이 페이지에는 그보다도 넓게 뺀 <strong>식료품·에너지 제외</strong>까지 셋 다 있습니다. ' +
        '한국의 근원물가(농산물·석유류 제외)와도 범위가 다르니, 나라별 숫자를 나란히 놓을 때는 ' +
        '이름이 아니라 <strong>무엇을 뺐는지</strong>를 맞춰야 합니다.',
      noteThree:
        '<strong>셋은 같은 분포를 다르게 요약한 값입니다.</strong> <strong>절사평균</strong>은 ' +
        '가격 변화 순으로 줄 세운 뒤 양끝을 잘라내고 남은 가운데를 평균하고, ' +
        '<strong>가중중앙값</strong>은 지출 비중 기준 딱 한가운데 품목의 변화율이며, ' +
        '<strong>최빈값</strong>은 가장 많은 품목이 몰려 있는 변화율입니다. ' +
        '셋이 벌어질 때가 정보인데, 분포가 한쪽으로 길게 늘어졌다는 뜻이기 때문입니다 — ' +
        '중앙값이 낮은데 절사평균이 높으면 소수 품목이 크게 올려 평균을 끌어올리고 있는 것입니다.',
      noteBase:
        '<strong>기준연도가 5년마다 바뀝니다.</strong> 일본 CPI는 5년 주기로 기준연도를 개정하고, ' +
        '일본은행 파일은 기준별로 열을 나눠 싣습니다. 각 기준이 자기 5년 구간을 겹침 없이 덮고 있어 ' +
        '월마다 값이 있는 열을 그대로 이어붙였습니다. 전년비 "비율"이라 지수처럼 연결·재기준화할 ' +
        '필요가 없습니다. 다만 기준 개정 시점에는 품목 구성과 가중치가 바뀌므로, 그 경계를 넘는 ' +
        '비교는 조금 느슨하게 보시는 편이 좋습니다.',
      noteRecession:
        '<strong>경기후퇴 구간은 사후에 확정된 것입니다.</strong> 내각부 경기동향지수연구회가 ' +
        '정점·저점을 <strong>한참 지난 뒤에</strong> 확정합니다 — 2018년 10월 정점은 몇 년이 지나서야 ' +
        '정해졌습니다. 그래서 <strong>차트 오른쪽 끝에는 음영이 절대 나타날 수 없습니다.</strong> ' +
        '지금 후퇴가 진행 중이더라도 아직 판정 전이라 표시되지 않습니다. 음영은 정점 다음 달부터 ' +
        '저점까지이며, 이 페이지가 담고 있는 구간은 2001년 이후 네 번입니다.',
      noteSource:
        '<strong>출처.</strong> 주력 계열은 일본은행 조사통계국의 <code>cpirev.xlsx</code> ' +
        '한 파일에서 나옵니다 — ' +
        '<a href="https://www.boj.or.jp/en/research/research_data/cpi/index.htm">기조적 인플레율 파악 지표</a>. ' +
        '공식 CPI 발표 <strong>2영업일 뒤 오후 2시</strong>에 갱신되고, 이 사이트도 매일 그 파일을 ' +
        '확인해 값이 바뀔 때만 갱신합니다. "(공식)"이 붙은 세 계열만 총무성 통계를 e-Stat API ' +
        '(2025년 기준 표, 전년동월비)에서 따로 받습니다. 경기후퇴 구간은 내각부 경기기준일자입니다.',
    },

    aria: {
      tiles: '주요 지표 요약',
      filters: '기간 필터',
      legendToggle: '계열 표시 전환',
      chartYoy: '절사평균·가중중앙값·최빈값과 CPI 제외 계열의 전년 대비 상승률 추이 선그래프',
      chartBreadth: '전년 대비 가격이 오른 품목과 내린 품목의 비율 추이 선그래프',
      themeToDark: '다크 모드로 전환',
      themeToLight: '라이트 모드로 전환',
      langSwitch: '일본어로 전환',
    },

    ui: {
      noData: '데이터를 불러오지 못했습니다. <code>npm run fetch</code> 를 먼저 실행하세요.',
      themeDark: '🌙 다크',
      themeLight: '☀ 라이트',
      langButton: '日本語',
      tableOpen: '표 열기',
      tableClose: '표 닫기',
      target: '일본은행 목표 2%',
      targetShort: '2%',
      sep: ' · ',
      deltaTitle: '직전 발표월 대비',
      heroMeta: '특수요인 제외 · 출처 일본은행',
      baseYear: '년 기준',

      ranges: { all: '전체', '20y': '20년', '10y': '10년', '5y': '5년', '3y': '3년' },

      series: {
        trimmedMean: '절사평균',
        weightedMedian: '가중중앙값',
        mode: '최빈값',
        exFresh: '코어 (생선식품 제외)',
        exFreshEnergy: '코어코어',
        exFoodEnergy: '식료품·에너지 제외',
        headline: '총합 CPI (공식)',
        coreOfficial: '코어 CPI (공식)',
        coreCoreOfficial: '코어코어 (공식)',
        shareRising: '상승 품목 비율',
        shareFalling: '하락 품목 비율',
        diffusion: '상승－하락',
      },

      tiles: {
        weightedMedian: ['가중중앙값', '전년 대비'],
        mode: ['최빈값', '전년 대비'],
        exFresh: ['코어 (생선식품 제외)', '일본식 코어'],
        exFoodEnergy: ['식료품·에너지 제외', '미국식 Core에 해당'],
        shareRising: ['상승 품목 비율', '전년 대비 상승'],
        diffusion: ['상승－하락', '%포인트', '%p'],
      },

      tipNone: '해당 월 데이터 없음',

      table: {
        month: '월',
        cols: {
          trimmedMean: '절사평균', weightedMedian: '가중중앙값', mode: '최빈값',
          exFresh: '코어', exFreshEnergy: '코어코어', exFoodEnergy: '식료품·에너지 제외',
          headline: '총합(공식)', coreOfficial: '코어(공식)', coreCoreOfficial: '코어코어(공식)',
          shareRising: '상승 품목', shareFalling: '하락 품목', diffusion: '상승－하락',
        },
        caption: (from, to) =>
          `${from} ~ ${to} · 단위 % · 품목 비율만 전체 대비 비중이고 나머지는 전년 대비 · 미발표 월은 —`,
      },

      baseNote: (spans) =>
        `기준연도 구간: ${spans}. 일본 CPI는 5년마다 기준을 개정하며, 각 기준이 자기 구간을 ` +
        '겹침 없이 덮고 있어 그대로 이어붙였습니다.',

      generated: (when, from, to) =>
        `데이터 최종 변경 ${when} · 수록 범위 ${from} ~ ${to} · ` +
        '매일 자동으로 일본은행 파일을 확인해 값이 바뀔 때만 갱신합니다.',
    },
  },

  // ──────────────────────────────────────────────────────────────── 日本語
  ja: {
    label: '日本語',
    htmlLang: 'ja',
    locale: 'ja-JP',
    month: (y, m) => `${y}年${Number(m)}月`,
    monthShort: (m) => m.replace('-', '.'),

    doc: {
      title: '日本の基調的インフレ — 刈込平均値・加重中央値・最頻値',
      desc: '日本銀行が毎月公表する基調的なインフレ率の指標。刈込平均値・加重中央値・最頻値と上昇・下落品目比率を2001年から見られます。特殊要因を除いた調査統計局の試算値です。',
    },

    html: {
      h1: '日本の基調的インフレ',
      subtitle:
        '日本銀行調査統計局が毎月公表する<strong>基調的なインフレ率の指標</strong>です。' +
        '総合から品目を除くのではなく、その月の<strong>品目別価格変化の分布を統計で要約</strong>します — ' +
        '<strong>刈込平均値</strong>は両端を切り落とした平均、<strong>加重中央値</strong>はちょうど真ん中の品目、' +
        '<strong>最頻値</strong>は最も多くの品目が集まる変化率です。' +
        '分布から読む指標なので、特定品目の急騰・急落に振り回されにくいという性質があります。',
      heroLabel: '刈込平均値・前年比',
      filterLabel: '期間',

      yoyTitle: '基調的インフレ — 前年比（YoY）',
      yoySub:
        '前の3つは<strong>価格変化の分布から読む</strong>指標で、後ろの3つは' +
        '<strong>バスケットから品目を除く</strong>方式です。既定では分布指標3つとコアが表示され、' +
        '凡例をクリックすると残りも出せます。縦の灰色帯は内閣府が事後に確定した景気後退期、' +
        '横の基準線は日本銀行の物価目標2%です。',

      breadthTitle: '値上がりした品目はどれだけあるか',
      breadthSub:
        '前年比で価格が<strong>上昇した品目</strong>と<strong>下落した品目</strong>の比率です。' +
        '物価上昇が一部の品目に偏っているのか、それとも全面的に広がっているのかを示します — ' +
        '刈込平均値が低くても上昇品目比率が高ければ、圧力が幅広く残っているということです。' +
        '2本の線の<strong>間隔がそのまま拡散指数（上昇－下落）</strong>になるので、別途は描いていません。' +
        '単位が%ポイントで異なり、同じ軸に載せると誤解を招くという理由もあります。値はタイルと表にあります。',

      tableTitle: 'データテーブル',
      tableSub: 'グラフのすべての値を数値で確認できます。新しいデータが上です。',

      notesTitle: '読むときの注意点',
      noteSpecial:
        '<strong>ここの数字はニュースで見る公表CPIとは違います。</strong>日本銀行が' +
        '<strong>「特殊要因」を除いた独自の試算値</strong>だからです。消費税率の変更、教育無償化' +
        '（2026年4月からの給食費無償化を含む）、2021年の携帯電話通信料の引き下げ、旅行支援策、' +
        '電気・ガス・ガソリンの負担軽減策がこれにあたります。政策が生んだ一度きりの段差を取り除かないと' +
        '時系列が比較できなくなるためですが、その分だけ総務省の公表値とはずれます。' +
        '<strong>どれだけずれるかは実際に見比べられます</strong> — 凡例で「（公表値）」の付いた' +
        '3系列を表示すると、総務省の公表値が重ねて描かれます。2026年7月時点で公表コアは1.8%、' +
        '特殊要因を除いた日本銀行の値は2.3%です。電気・ガス・ガソリンの負担軽減策が公表値を' +
        '0.5%ポイントほど押し下げているということになります。' +
        '何を特殊要因とみなすかも変わりうる点にご注意ください。',
      noteCore:
        '<strong>日本の「コア」は米国のCoreとは違います。</strong>日本で「コアCPI」といえば' +
        '<strong>生鮮食品だけ</strong>を除いた指数で、<strong>エネルギーは入ったまま</strong>です。' +
        '米国式のCore（食料・エネルギーを除く）にあたるのはもう一段除いた「<strong>コアコア</strong>」で、' +
        'このページにはさらに広く除いた<strong>食料・エネルギー除く</strong>まで3つとも並べてあります。' +
        '韓国のコア（農産物・石油類を除く）とも範囲が違うので、国をまたいで数字を並べるときは' +
        '名前ではなく<strong>何を除いたか</strong>で揃える必要があります。',
      noteThree:
        '<strong>3つは同じ分布を別のやり方で要約した値です。</strong><strong>刈込平均値</strong>は' +
        '価格変化の順に並べて両端を切り落とし、残った中央を平均します。<strong>加重中央値</strong>は' +
        '支出ウェイトでちょうど真ん中に来る品目の変化率、<strong>最頻値</strong>は最も多くの品目が' +
        '集まっている変化率です。3つが開くときが情報で、分布が片側に長く伸びているということを意味します — ' +
        '中央値が低いのに刈込平均値が高ければ、少数の品目が大きく上がって平均を押し上げている状態です。',
      noteBase:
        '<strong>基準年は5年ごとに変わります。</strong>日本のCPIは5年周期で基準年を改定し、' +
        '日本銀行のファイルは基準ごとに列を分けて収録しています。各基準が自分の5年間を重なりなく' +
        '覆っているので、月ごとに値のある列をそのままつないでいます。前年比の「率」なので、' +
        '指数のように接続や再基準化をする必要はありません。ただし基準改定の時点では品目構成と' +
        'ウェイトが変わるため、その境をまたぐ比較は少し緩めに見るのが安全です。',
      noteRecession:
        '<strong>景気後退期は事後に確定されたものです。</strong>内閣府の景気動向指数研究会が' +
        '山・谷を<strong>かなり経ってから</strong>確定します — 2018年10月の山が定まったのは数年後でした。' +
        'そのため<strong>グラフの右端に陰影が現れることは決してありません。</strong>' +
        '今まさに後退が進行中だとしても、まだ判定前なので表示されません。陰影は山の翌月から谷までで、' +
        'このページが含む区間は2001年以降の4回です。',
      noteSource:
        '<strong>出典。</strong>主要な系列は日本銀行調査統計局の<code>cpirev.xlsx</code>' +
        '1ファイルから来ています — ' +
        '<a href="https://www.boj.or.jp/research/research_data/cpi/index.htm">基調的なインフレ率を捕捉するための指標</a>。' +
        '公表CPIの<strong>2営業日後の午後2時</strong>に更新され、このサイトも毎日そのファイルを' +
        '確認し、値が変わったときだけ更新します。「（公表値）」の付いた3系列だけは総務省の統計を' +
        'e-Stat API（2025年基準表、前年同月比）から別途取得しています。' +
        '景気後退期は内閣府の景気基準日付です。',
    },

    aria: {
      tiles: '主要指標の要約',
      filters: '期間フィルター',
      legendToggle: '系列の表示切り替え',
      chartYoy: '刈込平均値・加重中央値・最頻値とCPIの除外系列の前年比上昇率の推移を示す折れ線グラフ',
      chartBreadth: '前年比で価格が上昇した品目と下落した品目の比率の推移を示す折れ線グラフ',
      themeToDark: 'ダークモードに切り替え',
      themeToLight: 'ライトモードに切り替え',
      langSwitch: '韓国語に切り替え',
    },

    ui: {
      noData: 'データを読み込めませんでした。先に <code>npm run fetch</code> を実行してください。',
      themeDark: '🌙 ダーク',
      themeLight: '☀ ライト',
      langButton: '한국어',
      tableOpen: '表を開く',
      tableClose: '表を閉じる',
      target: '日銀目標 2%',
      targetShort: '2%',
      sep: '・',
      deltaTitle: '前回公表月との比較',
      heroMeta: '特殊要因を除く・出典 日本銀行',
      baseYear: '年基準',

      ranges: { all: '全期間', '20y': '20年', '10y': '10年', '5y': '5年', '3y': '3年' },

      series: {
        trimmedMean: '刈込平均値',
        weightedMedian: '加重中央値',
        mode: '最頻値',
        exFresh: 'コア（生鮮食品を除く）',
        exFreshEnergy: 'コアコア',
        exFoodEnergy: '食料・エネルギー除く',
        headline: '総合CPI（公表値）',
        coreOfficial: 'コアCPI（公表値）',
        coreCoreOfficial: 'コアコア（公表値）',
        shareRising: '上昇品目比率',
        shareFalling: '下落品目比率',
        diffusion: '上昇－下落',
      },

      tiles: {
        weightedMedian: ['加重中央値', '前年比'],
        mode: ['最頻値', '前年比'],
        exFresh: ['コア（生鮮食品を除く）', '日本式のコア'],
        exFoodEnergy: ['食料・エネルギー除く', '米国式Coreに相当'],
        shareRising: ['上昇品目比率', '前年比で上昇'],
        diffusion: ['上昇－下落', '%ポイント', '%pt'],
      },

      tipNone: '当月のデータなし',

      table: {
        month: '月',
        cols: {
          trimmedMean: '刈込平均値', weightedMedian: '加重中央値', mode: '最頻値',
          exFresh: 'コア', exFreshEnergy: 'コアコア', exFoodEnergy: '食料・エネ除く',
          headline: '総合（公表）', coreOfficial: 'コア（公表）', coreCoreOfficial: 'コアコア（公表）',
          shareRising: '上昇品目', shareFalling: '下落品目', diffusion: '上昇－下落',
        },
        caption: (from, to) =>
          `${from} 〜 ${to} ・単位 % ・品目比率のみ全体に占める割合、それ以外は前年比 ・未公表の月は —`,
      },

      baseNote: (spans) =>
        `基準年の区間：${spans}。日本のCPIは5年ごとに基準を改定しており、各基準が自分の区間を` +
        '重なりなく覆っているため、そのままつないでいます。',

      generated: (when, from, to) =>
        `データ最終更新 ${when} ・収録範囲 ${from} 〜 ${to} ・` +
        '毎日自動で日本銀行のファイルを確認し、値が変わったときだけ更新します。',
    },
  },
};
