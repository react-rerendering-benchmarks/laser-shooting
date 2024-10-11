import { memo } from "react";
import { Link } from 'react-router-dom';
export default memo(function Camera() {
  return <>
      <Link to="/setting"> Setting</Link>
      Camera
    </>;
});