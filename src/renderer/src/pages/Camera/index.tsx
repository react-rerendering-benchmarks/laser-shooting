import { Link } from 'react-router-dom';
export default function Camera() {
  console.log(window.globalCount++);
  return <>
      <Link to="/setting"> Setting</Link>
      Camera
    </>;
}
declare global {
  interface Window {
    globalCount: number;
  }
}
window.globalCount = 0;