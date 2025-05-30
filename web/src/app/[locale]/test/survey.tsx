'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@nextui-org/button';
import { RadioGroup, Radio } from '@nextui-org/radio';
import { Progress } from '@nextui-org/progress';
import confetti from 'canvas-confetti';
import { useRouter } from '@/navigation';

import { CloseIcon, InfoIcon } from '@/components/icons';
// import { type Question } from '@bigfive-org/questions';
// Custom Question type to match our entrepreneurship questions
interface Question {
  id: string;
  text: string;
  keyed: string;
  domain: string;
  facet: number;
  choices?: { text: string; score: number; color: number }[];
  num: string | number;
}
import { sleep, formatTimer, isDev } from '@/lib/helpers';
import useWindowDimensions from '@/hooks/useWindowDimensions';
import useTimer from '@/hooks/useTimer';
import { type Answer } from '@/types';
import { Card, CardHeader } from '@nextui-org/card';

interface SurveyProps {
  questions: Question[];
  nextText: string;
  prevText: string;
  resultsText: string;
  saveTest: Function;
  language: string;
}

export const Survey = ({
  questions,
  nextText,
  prevText,
  resultsText,
  saveTest,
  language
}: SurveyProps) => {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionsPerPage, setQuestionsPerPage] = useState(1);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [restored, setRestored] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const { width } = useWindowDimensions();
  const seconds = useTimer();

  useEffect(() => {
    const handleResize = () => {
      setQuestionsPerPage(window.innerWidth > 768 ? 3 : 1);
    };
    handleResize();
  }, [width]);

  useEffect(() => {
    const restoreData = () => {
      if (dataInLocalStorage()) {
        console.log('Restoring data from local storage');
        restoreDataFromLocalStorage();
      }
    };
    restoreData();
  }, []);

  const currentQuestions = useMemo(
    () =>
      questions.slice(
        currentQuestionIndex,
        currentQuestionIndex + questionsPerPage
      ),
    [currentQuestionIndex, questions, questionsPerPage]
  );

  const isTestDone = questions.length === answers.length;

  const progress = Math.round((answers.length / questions.length) * 100);

  const nextButtonDisabled =
    inProgress ||
    currentQuestionIndex + questionsPerPage > answers.length ||
    (isTestDone &&
      currentQuestionIndex === questions.length - questionsPerPage) ||
    loading;

  const backButtonDisabled = currentQuestionIndex === 0 || loading;

  async function handleAnswer(id: string, value: string) {
    const question = questions.find((question) => question.id === id);
    if (!question) return;

    const newAnswer: Answer = {
      id,
      score: Number(value),
      domain: question.domain,
      facet: question.facet
    };

    setAnswers((prevAnswers) => [
      ...prevAnswers.filter((a) => a.id !== id),
      newAnswer
    ]);

    const latestAnswerId = answers.slice(-1)[0]?.id;

    if (
      questionsPerPage === 1 &&
      questions.length !== answers.length + 1 &&
      id !== latestAnswerId
    ) {
      setInProgress(true);
      await sleep(700);
      setCurrentQuestionIndex((prev) => prev + 1);
      window.scrollTo(0, 0);
      setInProgress(false);
    }
    populateDataInLocalStorage();
  }

  function handlePreviousQuestions() {
    setCurrentQuestionIndex((prev) => prev - questionsPerPage);
    window.scrollTo(0, 0);
  }

  function handleNextQuestions() {
    if (inProgress) return;
    setCurrentQuestionIndex((prev) => prev + questionsPerPage);
    window.scrollTo(0, 0);
    if (restored) setRestored(false);
  }

  function skipToEnd() {
    const randomAnswers = questions
      .map((question) => ({
        id: question.id,
        score: Math.floor(Math.random() * 5) + 1,
        domain: question.domain,
        facet: question.facet
      }))
      .slice(0, questions.length - 1);

    setAnswers([...randomAnswers]);
    setCurrentQuestionIndex(questions.length - 1);
  }

  async function submitTest() {
    try {
      setLoading(true);
      confetti({});
      console.log('Submitting test with answers:', answers.length);
      
      const result = await saveTest({
        testId: 'b5-120',
        lang: language,
        invalid: false,
        timeElapsed: seconds,
        dateStamp: new Date(),
        answers
      });
      
      console.log('Test saved successfully:', result);
      
      localStorage.removeItem('inProgress');
      localStorage.removeItem('b5data');
      
      if (result && result.id) {
        console.log('Setting resultId in localStorage:', result.id);
        localStorage.setItem('resultId', result.id);
        console.log('Navigating to result page:', `/result/${result.id}`);
        router.push(`/result/${result.id}`);
      } else {
        console.error('Invalid result received from saveTest:', result);
        setLoading(false);
        alert('Error getting your results. Please try again.');
      }
    } catch (error) {
      console.error('Error in submitTest:', error);
      setLoading(false);
      alert('Error getting your results. Please try again.');
    }
  }

  function dataInLocalStorage() {
    return !!localStorage.getItem('inProgress');
  }

  function populateDataInLocalStorage() {
    localStorage.setItem('inProgress', 'true');
    localStorage.setItem(
      'b5data',
      JSON.stringify({ answers, currentQuestionIndex })
    );
  }

  function restoreDataFromLocalStorage() {
    const data = localStorage.getItem('b5data');
    if (data) {
      const { answers, currentQuestionIndex } = JSON.parse(data);
      setAnswers(answers);
      setCurrentQuestionIndex(currentQuestionIndex);
      setRestored(true);
    }
  }

  function clearDataInLocalStorage() {
    console.log('Clearing data from local storage');
    localStorage.removeItem('inProgress');
    localStorage.removeItem('b5data');
    location.reload();
  }

  return (
    <div className='mt-2'>
      <Progress
        aria-label='Progress bar'
        value={progress}
        className='max-w'
        showValueLabel={true}
        label={formatTimer(seconds)}
        minValue={0}
        maxValue={100}
        size='lg'
        color='secondary'
      />
      {restored && (
        <Card className='mt-4 bg-warning/20 text-warning-600 dark:text-warning'>
          <CardHeader className='justify-between'>
            <Button isIconOnly variant='light' color='warning'>
              <InfoIcon />
            </Button>
            <p className="leading-tight">
              Your answers has been restored. Click here to<span
                className='underline cursor-pointer touch-manipulation pl-1'
                style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                onClick={() => {
                  console.log('Starting new test clicked');
                  localStorage.removeItem('inProgress');
                  localStorage.removeItem('b5data');
                  location.reload();
                }}
                aria-label='Clear data'
              >start a new test</span>.
            </p>
            <div
              className='cursor-pointer touch-manipulation flex items-center justify-center'
              style={{ minWidth: '44px', minHeight: '44px', padding: '10px' }}
              onClick={() => {
                console.log('Close button clicked');
                setRestored(false);
              }}
              aria-label="Close notification"
            >
              <CloseIcon />
            </div>
          </CardHeader>
        </Card>
      )}
      {currentQuestions.map((question) => (
        <div key={'q' + question.num}>
          <h2 className='text-2xl my-4'>{question.text}</h2>
          <div>
            <div className="flex flex-col gap-1">
              {question.choices && question.choices.map((choice, index) => {
                const value = choice.score.toString();
                const isSelected = answers.find((answer) => answer.id === question.id)?.score.toString() === value;
                return (
                  <div 
                    key={index + question.id}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer touch-manipulation ${isSelected ? 'bg-secondary/20' : ''}`}
                    style={{ minHeight: '44px' }}
                    onClick={() => {
                      if (!inProgress) {
                        console.log(`Radio option clicked: ${choice.text} (${value})`);
                        handleAnswer(question.id, value);
                      }
                    }}
                  >
                    <div 
                      className={`w-5 h-5 rounded-full border-2 border-secondary flex items-center justify-center ${isSelected ? 'border-secondary' : 'border-gray-400'}`}
                    >
                      {isSelected && <div className="w-3 h-3 rounded-full bg-secondary" />}
                    </div>
                    <div>{choice.text}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
      <div className='my-12 space-x-4 inline-flex'>
        <div
          className={`px-4 py-2 rounded-md flex items-center justify-center touch-manipulation cursor-pointer ${backButtonDisabled ? 'opacity-50 cursor-not-allowed bg-gray-300' : 'bg-primary text-white'}`}
          style={{ minWidth: '44px', minHeight: '44px' }}
          onClick={() => {
            if (!backButtonDisabled) {
              console.log('Back button clicked');
              setCurrentQuestionIndex((prev) => prev - questionsPerPage);
              window.scrollTo(0, 0);
            }
          }}
          aria-disabled={backButtonDisabled}
        >
          {prevText.toUpperCase()}
        </div>

        <div
          className={`px-4 py-2 rounded-md flex items-center justify-center touch-manipulation cursor-pointer ${nextButtonDisabled ? 'opacity-50 cursor-not-allowed bg-gray-300' : 'bg-primary text-white'}`}
          style={{ minWidth: '44px', minHeight: '44px' }}
          onClick={() => {
            if (!nextButtonDisabled) {
              console.log('Next button clicked');
              if (inProgress) return;
              setCurrentQuestionIndex((prev) => prev + questionsPerPage);
              window.scrollTo(0, 0);
              if (restored) setRestored(false);
            }
          }}
          aria-disabled={nextButtonDisabled}
        >
          {nextText.toUpperCase()}
        </div>

        {isTestDone && (
          <div
            className={`px-4 py-2 rounded-md flex items-center justify-center touch-manipulation cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed bg-gray-300' : 'bg-secondary text-white'}`}
            style={{ minWidth: '44px', minHeight: '44px' }}
            onClick={() => {
              if (!loading) {
                console.log('Results button clicked');
                submitTest();
              }
            }}
            aria-disabled={loading}
          >
            {loading ? 'Loading...' : resultsText.toUpperCase()}
          </div>
        )}

      </div>
    </div>
  );
};
