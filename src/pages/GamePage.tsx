import { CategoryPicker } from '../components/CategoryPicker';
import { getCategory } from '../data';
import { getGame } from '../games/config';
import { ListenChoose } from '../games/ListenChoose';
import { Memory } from '../games/Memory';
import { OddOneOut } from '../games/OddOneOut';
import { Quiz } from '../games/Quiz';
import { Scramble } from '../games/Scramble';
import { SentenceBuilder } from '../games/SentenceBuilder';
import { Spelling } from '../games/Spelling';
import { WordSearch } from '../games/WordSearch';
import { navigate } from '../lib/router';

type GamePageProps = {
  gameId: string;
  categoryId?: string;
};

export function GamePage({ gameId, categoryId }: GamePageProps) {
  const game = getGame(gameId);

  if (!game) {
    return (
      <div className="page">
        <div className="panel empty-state">
          <h1>That game has flown away 🦉</h1>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/games')}>
            Back to the arcade
          </button>
        </div>
      </div>
    );
  }

  const category = categoryId ? getCategory(categoryId) : undefined;
  if (!category) {
    return (
      <CategoryPicker gameId={game.id} gameName={game.name} gameEmoji={game.emoji} />
    );
  }

  switch (game.id) {
    case 'wordsearch':
      return <WordSearch key={category.id} category={category} />;
    case 'memory':
      return <Memory key={category.id} category={category} />;
    case 'listen':
      return <ListenChoose key={category.id} category={category} />;
    case 'spelling':
      return <Spelling key={category.id} category={category} />;
    case 'scramble':
      return <Scramble key={category.id} category={category} />;
    case 'sentence':
      return <SentenceBuilder key={category.id} category={category} />;
    case 'quiz':
      return <Quiz key={category.id} category={category} />;
    case 'oddone':
      return <OddOneOut key={category.id} category={category} />;
    default:
      return <CategoryPicker gameId={game.id} gameName={game.name} gameEmoji={game.emoji} />;
  }
}
