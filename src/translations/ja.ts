
export const ja = {
  navbar: {
    takeTest: 'テストを受ける',
    signIn: 'サインイン',
    signOut: 'サインアウト',
    welcome: 'ようこそ',
    viewTestHistory: 'テスト履歴を見る'
  },
  common: {
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    cancel: 'キャンセル',
    save: '保存',
    delete: '削除',
    edit: '編集',
    close: '閉じる',
    checkingAccess: 'アクセスを確認中...'
  },
  home: {
    title: 'Palavox Cert',
    subtitle: '学術言語認定プラットフォーム',
    startTest: 'テスト開始',
    featuresTitle: '認定機能',
    speakingAssessment: {
      title: 'スピーキング評価',
      description: 'AIを活用したインタラクティブな会話テストで、スピーキング能力を評価します。'
    },
    multipleChoice: {
      title: '多肢選択問題',
      description: 'ACTFLレベル全体にわたる包括的な言語知識評価。'
    },
    writingExam: {
      title: 'ライティング試験',
      description: 'あなたの熟練度レベルに合わせたライティングプロンプトで自己表現。'
    },
    ctaTitle: '認定を受ける準備はできましたか？',
    ctaDescription: '国際的に認められた認定であなたの言語能力を示しましょう。',
    takeTestNow: '今すぐテストを受ける',
    footer: {
      copyright: '無断転載禁止。'
    }
  },
  test: {
    nativeLanguageSelection: {
      title: '英語能力テスト',
      subtitle: '母国語を選択',
      description: 'テストの指示と質問は母国語で提供されます',
      noteDescription: 'テストの内容はすべて英語で、英語能力を評価します。指示、説明、インターフェース要素は選択した母国語で表示されます。'
    },
    languageSelection: {
      english: '英語',
      spanish: 'スペイン語',
      french: 'フランス語',
      german: 'ドイツ語',
      italian: 'イタリア語',
      portuguese: 'ポルトガル語'
    },
    testSelection: {
      englishTest: {
        pageTitle: '英語能力テスト',
        subtitle: '英語スキルのテスト - {language}での指示',
        description: '母国語での指示を含む包括的な英語能力評価'
      },
      initialization: {
        title: 'テスト環境の設定中',
        description: 'すぐにテストを開始できます - 質問はオンデマンドで生成されます！'
      },
      english: {
        proficiencyTest: '英語能力テスト',
        testingSkills: '英語スキルのテスト',
        comprehensiveTest: '母国語のインターフェースによる包括的な英語能力評価',
        certificationTest: '認定テスト',
        multiPhaseAssessment: 'リーディング、リスニング、ライティング、スピーキングを含む多段階評価',
        skills: {
          readingComprehension: '読解',
          listeningSkills: 'リスニングスキル',
          grammarVocabulary: '文法と語彙',
          writingProficiency: 'ライティング能力',
          speakingAssessment: 'スピーキング評価'
        },
        startTest: '英語テストを開始',
        environmentReady: 'テスト環境準備完了'
      },
      spanish: {
        proficiencyTest: 'スペイン語能力テスト',
        testingSkills: 'スペイン語スキルのテスト',
        comprehensiveTest: '包括的なスペイン語能力評価',
        certificationTest: '認定テスト',
        multiPhaseAssessment: 'リーディング、リスニング、ライティング、スピーキングを含む多段階評価',
        skills: {
          readingComprehension: '読解',
          listeningSkills: 'リスニングスキル',
          grammarVocabulary: '文法と語彙',
          writingProficiency: 'ライティング能力',
          speakingAssessment: 'スピーキング評価'
        },
        startTest: 'スペイン語テストを開始',
        environmentReady: 'テスト環境準備完了'
      },
      default: {
        proficiencyTest: '言語能力テスト',
        testingSkills: '言語スキルのテスト',
        comprehensiveTest: '包括的な言語能力評価',
        certificationTest: '認定テスト',
        multiPhaseAssessment: 'リーディング、リスニング、ライティング、スピーキングを含む多段階評価',
        skills: {
          readingComprehension: '読解',
          listeningSkills: 'リスニングスキル',
          grammarVocabulary: '文法と語彙',
          writingProficiency: 'ライティング能力',
          speakingAssessment: 'スピーキング評価'
        },
        startTest: 'テストを開始',
        environmentReady: 'テスト環境準備完了'
      }
    },
    phaseSelection: {
      title: "テストパスを選択",
      subtitle: "特定のスキルをテストするために個別のフェーズを選択するか、完全な認定テストを受けてください",
      backToSelection: "フェーズ選択に戻る",
      individualAssessment: "個別フェーズ評価",
      fullCertification: {
        title: "完全認定テスト",
        description: "公式能力証明書を取得するために5つのフェーズすべてを完了 • 75-100分",
        button: "完全認定を開始"
      },
      divider: "または個別のフェーズを選択",
      phases: {
        comprehension: {
          title: "理解",
          description: "読解+聴解を1つのフェーズに",
          duration: "15-20分",
          button: "理解を開始"
        },
        conversation: {
          title: "会話の流暢さ",
          description: "リアルタイムAI会話",
          duration: "10分",
          button: "会話を開始"
        },
        reading: {
          title: "読解",
          description: "理解問題で読解力をテスト",
          duration: "15-20分",
          button: "読解を開始"
        },
        listening: {
          title: "聴解",
          description: "音声コンテンツでリスニング能力を評価",
          duration: "15-20分",
          button: "聴解を開始"
        },
        writing: {
          title: "ライティング評価",
          description: "ライティング能力を実証",
          duration: "20-25分",
          button: "ライティングを開始"
        },
        speaking: {
          title: "スピーキング評価",
          description: "プロンプトを通じてスピーキングスキルを示す",
          duration: "15-20分",
          button: "スピーキングを開始"
        },
        "conversational-fluency": {
          title: "会話の流暢さ",
          description: "リアルタイムAI会話で流暢さを評価",
          duration: "10-15分",
          button: "会話を開始"
        }
      },
      durationLabel: "所要時間：",
      loading: "読み込み中..."
    },
    englishProficiency: {
      title: '英語能力テスト',
      description: '母国語のインターフェースによる包括的な英語能力評価',
      selectNativeLanguage: '母国語を選択してください：',
      testIncludes: 'このテストには以下が含まれます：',
      grammarVocabulary: '文法と語彙',
      interfaceLanguage: 'テストインターフェースは{language}で表示されます',
      startTest: '英語テストを開始'
    },
    phases: {
      reading: {
        title: '読解',
        loadingContent: 'コンテンツを読み込み中...',
        noContent: '利用可能なコンテンツがありません',
        readingPassage: '読解文',
        question: '質問',
        nextQuestion: '次の質問',
        completePhase: 'フェーズ完了',
        loadError: '読解コンテンツの読み込みに失敗しました',
        evaluationError: '読解回答の評価に失敗しました'
      },
      listening: {
        title: 'リスニングスキル',
        loadingContent: 'コンテンツを読み込み中...',
        noContent: '利用可能なコンテンツがありません',
        retryLoading: '再読み込み',
        audioPassage: '音声パッセージ',
        listenCarefully: '注意深く聞いてください',
        audioWillPlay: '音声が再生されます',
        question: '質問',
        nextQuestion: '次の質問',
        completePhase: 'フェーズ完了'
      },
      writing: {
        title: 'ライティング能力',
        loadingPrompts: 'ライティングプロンプトを読み込み中...',
        noPrompts: '利用可能なプロンプトがありません',
        writingPrompt: 'ライティングプロンプト',
        sideBySide: {
          nativeLabel: 'あなたの言語での指示：',
          englishLabel: '英語での指示：'
        },
        yourResponse: 'あなたの回答：',
        responsePlaceholder: 'ここに回答を書いてください...',
        expectedLength: '期待される長さ：',
        noviceLength: '50-100語',
        intermediateLength: '100-200語',
        advancedLength: '200-300語',
        nextPrompt: '次のプロンプト',
        completePhase: 'フェーズ完了'
      },
      speaking: {
        title: 'スピーキング評価',
        loadingPrompts: 'スピーキングプロンプトを読み込み中...',
        noPrompts: '利用可能なプロンプトがありません',
        speakingPrompt: 'スピーキングプロンプト',
        speakingIn: '使用言語',
        startRecording: '録音開始',
        stopRecording: '録音停止',
        recording: '録音中...',
        yourResponse: 'あなたの回答：',
        speechWillAppear: 'あなたの音声がここに表示されます...',
        nextPrompt: '次のプロンプト',
        completePhase: 'フェーズ完了'
      },
      "conversational-fluency": {
        title: "会話の流暢さ評価",
        description: "AIインタビュアーと自然な会話をする",
        speakInEnglish: "英語で会話を始める",
        conversationTip: "「Hello」と言ったり自己紹介するだけでも構いません",
        micOff: "マイクオフ",
        listening: "聞き取り中",
        howItWorks: "使い方：",
        step1: "「会話を開始」をクリックして開始",
        step2: "AIインタビュアーと英語で自然な会話をする（最低1分）",
        step3: "AIが話すのを止めたことを検知し、自動的に応答します",
        step4: "準備ができたら「会話を終了」をクリック（推奨：3分以上）",
        tip: "ヒント：挨拶と自己紹介だけでも構いません。会話は自然に流れます。",
        startConversation: "会話を開始",
        endConversation: "会話を終了"
      },
      common: {
        questionOf: '質問{current}/{total}',
        level: 'レベル',
        promptOf: 'プロンプト{current}/{total}',
        phraseOf: 'フレーズ{current}/{total}'
      }
    },
    multiPhase: {
      certificationTest: '認定テスト',
      phaseOf: 'フェーズ{current}/{total}',
      percentComplete: '{percent}% 完了',
      completedPhases: '完了フェーズ',
      testCompleted: 'テストが完了し、正常に保存されました！',
      saveError: 'テストは完了しましたが、保存に失敗しました。再試行してください。'
    }
  },
  results: {
    title: 'テスト結果',
    loadingResults: '結果を読み込み中...',
    languageProficiencyAssessment: '言語能力評価',
    overallScore: '総合スコア',
    proficiencyLevel: '熟練度レベル',
    actflEquivalent: 'ACTFL相当：',
    quickAssessment: 'クイック評価',
    aiTutoringAvailable: '🎯 AIチュータリング利用可能',
    aiTutoringDescription: 'スコアレポートをPalavox.worldにアップロードして、パーソナライズされた学習プランとAI搭載の言語コーチングを受けましょう。',
    sectionFeedback: 'セクションフィードバック',
    downloadFullReport: '詳細なフィードバックと推奨事項については、完全なレポートをダウンロードしてください。',
    questions: '問題：',
    questionsTotal: '総計',
    correct: '正解：',
    questionsAnswered: '問題',
    scoringMethod: 'スコアリング方法：',
    comprehensiveAnalysis: '📊 包括的分析',
    comprehensiveDescription: '詳細なスコアレポートには、セクション別内訳、フィードバック、個人的な改善推奨事項が含まれています。',
    downloadScoreReport: 'スコアレポートをダウンロード',
    generatingReport: 'レポートを生成中...',
    returnToHome: 'ホームに戻る',
    viewTestHistory: 'テスト履歴を見る',
    takeAnotherTest: '別のテストを受ける',
    scoreReportIssue: 'スコアレポートの問題',
    liveScoring: 'ライブACTFL：{actfl}（スコア：{score}%）• 統一スコアリングv2.0',
    scoredUsing: '強化システムを使用してスコアリング • {timestamp}',
    recentlyCompleted: '最近完了',
    scoreValidationNotice: 'スコア検証通知',
    scoreValidationDescription: '当社のスコアリングシステムは、あなたの回答を評価する際にいくつかの不確実性を検出しました。以下の詳細分析をご確認ください。',
    palavoxAssessments: 'Palavox評価は、詳細なフィードバックと改善ガイダンスを備えた包括的な言語能力評価を提供します。',
    breakdown: '詳細',
    recommendations: '推奨事項',
    downloadCertificate: '証明書をダウンロード',
    retakeTest: '再テスト'
  },
  subscription: {
    premium: 'プレミアム',
    features: '機能',
    upgrade: 'アップグレード',
    current: '現在',
    premiumMember: 'プレミアムメンバー',
    freeAccount: '無料アカウント',
    unlimitedAttempts: '無制限のテスト試行',
    premiumFeatures: 'プレミアム機能が解除されました',
    subscriptionRenews: 'サブスクリプション更新日',
    refreshStatus: 'ステータスを更新',
    upgradeButton: 'プレミアムにアップグレード',
    payPerTest: 'テストごとに$4.99を支払うか、プレミアムにアップグレードして無制限アクセス',
    checking: '確認中...'
  },
  languages: {
    english: '英語',
    spanish: 'スペイン語',
    french: 'フランス語',
    german: 'ドイツ語',
    italian: 'イタリア語',
    portuguese: 'ポルトガル語',
    japanese: '日本語'
  }
};
